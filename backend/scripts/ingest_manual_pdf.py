#!/usr/bin/env python3
"""
eBOM & Manual PDF Ingestion Script
====================================
Extracts tabular part data from a workshop manual PDF and upserts
parts into the database linked to a given assembly ID.

Usage:
    python ingest_manual_pdf.py \\
        --assembly-id ASM-CUMMINS-6BT \\
        --pdf-path /path/to/service_manual.pdf \\
        --start-page 4 \\
        --end-page 12 \\
        [--dry-run]

Dependencies:
    pip install pdfplumber httpx
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import logging
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("ingest_manual_pdf")

# ── Type for an extracted row ─────────────────────────────────────────────────


@dataclass
class ExtractedPart:
    pos_number: int | None
    oem_code: str
    name: str
    quantity: int
    torque_spec: str | None
    source_page: int
    # Assigned during upsert
    part_id: str = field(default="")

    def derive_id(self, assembly_id: str) -> str:
        """Deterministic ID from assembly + OEM code."""
        raw = f"{assembly_id}-{self.oem_code}"
        return "P-" + hashlib.sha1(raw.encode()).hexdigest()[:10].upper()


# ── PDF extraction logic ──────────────────────────────────────────────────────


def try_import_pdfplumber():  # type: ignore[return]
    try:
        import pdfplumber  # type: ignore[import]
        return pdfplumber
    except ImportError:
        logger.error(
            "pdfplumber not installed. Run: pip install pdfplumber"
        )
        sys.exit(1)


# Regex patterns for common eBOM table formats
_TORQUE_RE = re.compile(r"(\d+[\.,]?\d*)\s*(N[·\-]?m|ft[·\-]?lb|kgf[·\-]?m)", re.IGNORECASE)
_POS_RE = re.compile(r"^\d{1,3}$")


def _parse_torque(text: str) -> str | None:
    """Extracts first torque value from a text cell."""
    m = _TORQUE_RE.search(text)
    if m:
        return m.group(0).strip()
    return None


def extract_parts_from_pdf(
    pdf_path: Path,
    start_page: int,
    end_page: int,
    assembly_id: str,
) -> list[ExtractedPart]:
    """
    Extracts tabular eBOM rows from the PDF pages [start_page, end_page].
    Handles both pdfplumber table extraction and line-by-line fallback.

    Expected column order (flexible): Pos | OEM Code | Description | Qty | Torque
    """
    pdfplumber = try_import_pdfplumber()
    parts: list[ExtractedPart] = []

    logger.info("Opening PDF: %s", pdf_path)
    with pdfplumber.open(str(pdf_path)) as pdf:
        total_pages = len(pdf.pages)
        effective_end = min(end_page, total_pages)
        logger.info("PDF has %d pages. Scanning pages %d–%d.", total_pages, start_page, effective_end)

        for page_num in range(start_page - 1, effective_end):  # 0-indexed
            page = pdf.pages[page_num]
            source_page_num = page_num + 1

            # ── Strategy 1: table extraction ──────────────────────────────
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        if not row or len(row) < 2:
                            continue
                        # Normalize cells
                        cells = [str(c or "").strip() for c in row]

                        # Detect header row
                        header_keywords = {"pos", "code", "description", "desc", "qty", "part"}
                        if any(c.lower() in header_keywords for c in cells[:3]):
                            continue

                        # Try to identify columns by position
                        pos_num: int | None = None
                        oem_code = ""
                        name = ""
                        qty = 1
                        torque: str | None = None

                        if len(cells) >= 3:
                            # Column 0: pos
                            if _POS_RE.match(cells[0]):
                                pos_num = int(cells[0])
                                oem_code = cells[1]
                                name = cells[2]
                                if len(cells) > 3:
                                    qty_match = re.match(r"^\d+$", cells[3])
                                    qty = int(qty_match.group()) if qty_match else 1
                                if len(cells) > 4:
                                    torque = _parse_torque(cells[4])
                            else:
                                oem_code = cells[0]
                                name = cells[1]

                        if not oem_code or not name:
                            continue

                        part = ExtractedPart(
                            pos_number=pos_num,
                            oem_code=oem_code,
                            name=name,
                            quantity=qty,
                            torque_spec=torque,
                            source_page=source_page_num,
                        )
                        part.part_id = part.derive_id(assembly_id)
                        parts.append(part)

            else:
                # ── Strategy 2: line-by-line text fallback ────────────────
                text = page.extract_text() or ""
                for line in text.splitlines():
                    line = line.strip()
                    # Pattern: "01  CUM-3926872  Culata de Cilindros  1  163 Nm"
                    m = re.match(
                        r"^(\d{1,3})\s+([\w\-]{4,25})\s+(.{5,60}?)(?:\s+(\d)\s+(.+))?$", line
                    )
                    if not m:
                        continue
                    part = ExtractedPart(
                        pos_number=int(m.group(1)),
                        oem_code=m.group(2),
                        name=m.group(3).strip(),
                        quantity=int(m.group(4) or 1),
                        torque_spec=_parse_torque(m.group(5) or ""),
                        source_page=source_page_num,
                    )
                    part.part_id = part.derive_id(assembly_id)
                    parts.append(part)

    logger.info("Extracted %d parts from PDF.", len(parts))
    return parts


# ── Database upsert ───────────────────────────────────────────────────────────


async def upsert_parts(assembly_id: str, parts: list[ExtractedPart]) -> None:
    """Upserts extracted parts into the database via async SQLAlchemy."""
    # Import here to avoid circular imports when running standalone
    from app.core.database import Base, async_session_factory, engine  # noqa: PLC0415
    from app.models.sql_models import Assembly, Part  # noqa: PLC0415

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        assembly = await session.get(Assembly, assembly_id)
        if not assembly:
            logger.error("Assembly '%s' not found in database. Aborting.", assembly_id)
            sys.exit(1)

        upserted = 0
        for ep in parts:
            existing = await session.get(Part, ep.part_id)
            if existing:
                existing.pos_number = ep.pos_number
                existing.oem_code = ep.oem_code
                existing.name = ep.name
                existing.torque_spec = ep.torque_spec
                existing.manual_page = ep.source_page
            else:
                session.add(
                    Part(
                        id=ep.part_id,
                        assembly_id=assembly_id,
                        pos_number=ep.pos_number,
                        oem_code=ep.oem_code,
                        name=ep.name,
                        torque_spec=ep.torque_spec,
                        manual_page=ep.source_page,
                        explode_vector_x=0.0,
                        explode_vector_y=0.0,
                        explode_vector_z=0.0,
                    )
                )
                upserted += 1

        await session.commit()
        logger.info("Upserted %d new parts for assembly '%s'.", upserted, assembly_id)

    await engine.dispose()


# ── CLI entry point ───────────────────────────────────────────────────────────


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest eBOM parts from a workshop manual PDF into the VISION3DPARTS database."
    )
    parser.add_argument("--assembly-id", required=True, help="Target assembly ID")
    parser.add_argument("--pdf-path", required=True, type=Path, help="Path to the PDF file")
    parser.add_argument("--start-page", required=True, type=int, help="First page to scan (1-indexed)")
    parser.add_argument("--end-page", required=True, type=int, help="Last page to scan (inclusive)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract and print parts without writing to the database",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()

    if not args.pdf_path.exists():
        logger.error("PDF file not found: %s", args.pdf_path)
        sys.exit(1)

    parts = extract_parts_from_pdf(
        pdf_path=args.pdf_path,
        start_page=args.start_page,
        end_page=args.end_page,
        assembly_id=args.assembly_id,
    )

    if not parts:
        logger.warning("No parts extracted. Check PDF format and page range.")
        sys.exit(0)

    if args.dry_run:
        logger.info("DRY RUN — extracted parts (not saved):")
        print(json.dumps([vars(p) for p in parts], ensure_ascii=False, indent=2))
        return

    await upsert_parts(args.assembly_id, parts)
    logger.info("Ingestion complete.")


if __name__ == "__main__":
    asyncio.run(main())
