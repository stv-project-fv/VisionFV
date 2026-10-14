"""
pdf_extractor.py
~~~~~~~~~~~~~~~~
Pure extraction service: opens a PDF with pdfplumber and attempts to
identify eBOM-style parts tables (columns: Pos | Part No | Description | Qty | Figure).

Returns a list of dicts ready to be mapped to PartCreate.
Never raises on bad / table-free pages -- silently skips them.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

try:
    import pdfplumber  # type: ignore[import-untyped]
except ModuleNotFoundError as exc:  # pragma: no cover
    raise ImportError(
        "pdfplumber is required for PDF extraction. "
        "Install it with: pip install pdfplumber"
    ) from exc

# -- Column name normalisers ---------------------------------------------------

_POS_PATTERNS = re.compile(r"\b(pos|item|n[o]|#)\b", re.IGNORECASE)
_PART_PATTERNS = re.compile(r"\b(part\s*n[o]?|part\s*num|p/n|ref|referencia|c[o]digo)\b", re.IGNORECASE)
_DESC_PATTERNS = re.compile(r"\b(desc|name|nombre|denominaci[o]n|pieza|component)\b", re.IGNORECASE)
_QTY_PATTERNS = re.compile(r"\b(qty|cant|cantidad|q[t]?y\.?|pcs)\b", re.IGNORECASE)
_FIG_PATTERNS = re.compile(r"\b(fig|figura|lam|l[a]mina|dwg|drawing)\b", re.IGNORECASE)


def _identify_columns(header_row: list[str | None]) -> dict[str, int]:
    """Map logical column roles to their index in the row."""
    mapping: dict[str, int] = {}
    for i, cell in enumerate(header_row):
        if cell is None:
            continue
        cell_str = str(cell).strip()
        if _POS_PATTERNS.search(cell_str) and "pos" not in mapping:
            mapping["pos"] = i
        elif _PART_PATTERNS.search(cell_str) and "part" not in mapping:
            mapping["part"] = i
        elif _DESC_PATTERNS.search(cell_str) and "desc" not in mapping:
            mapping["desc"] = i
        elif _QTY_PATTERNS.search(cell_str) and "qty" not in mapping:
            mapping["qty"] = i
        elif _FIG_PATTERNS.search(cell_str) and "fig" not in mapping:
            mapping["fig"] = i
    return mapping


def _safe_int(value: str | None, default: int | None = None) -> int | None:
    """Parse a cell as integer, returning default if not possible."""
    if not value:
        return default
    try:
        return int(str(value).strip().split()[0])
    except (ValueError, IndexError):
        return default


def _safe_str(value: Any) -> str:
    """Convert a cell value to a clean string."""
    return str(value).strip() if value is not None else ""


def extract_parts_from_pdf(
    file_path: str,
    vehicle_id: str,
    assembly_id: str,
) -> list[dict[str, Any]]:
    """
    Open the PDF at file_path and extract every eBOM-like table it contains.

    Returns a list of dicts with keys matching PartCreate fields:
        id, assembly_id, pos_number, oem_code, name, manual_page, figure_code

    Pages without detectable tables are silently skipped.
    """
    results: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    try:
        with pdfplumber.open(file_path) as pdf:
            for page_index, page in enumerate(pdf.pages):
                page_number = page_index + 1
                try:
                    _process_page(page, page_number, vehicle_id, assembly_id, results, seen_ids)
                except Exception:  # noqa: BLE001
                    continue
    except Exception:  # noqa: BLE001
        return []

    return results


def _process_page(
    page: Any,
    page_number: int,
    vehicle_id: str,
    assembly_id: str,
    results: list[dict[str, Any]],
    seen_ids: set[str],
) -> None:
    """Extract parts from a single page, appending to results in-place."""
    tables = page.extract_tables() or []
    if not tables:
        return

    for table in tables:
        if not table or len(table) < 2:
            continue

        header = [str(c).strip() if c else "" for c in table[0]]
        col_map = _identify_columns(header)  # type: ignore[arg-type]

        if "part" not in col_map or "desc" not in col_map:
            continue

        for row in table[1:]:
            if not row:
                continue

            oem_code = _safe_str(row[col_map["part"]]) if len(row) > col_map.get("part", 999) else ""
            name = _safe_str(row[col_map["desc"]]) if len(row) > col_map.get("desc", 999) else ""

            if not oem_code or not name or oem_code.lower() in {"", "-", "n/a"}:
                continue
            if _PART_PATTERNS.search(oem_code):
                continue

            pos_number = (
                _safe_int(_safe_str(row[col_map["pos"]]))
                if "pos" in col_map and len(row) > col_map["pos"]
                else None
            )
            figure_code = (
                _safe_str(row[col_map["fig"]])
                if "fig" in col_map and len(row) > col_map["fig"]
                else None
            ) or None

            part_id = f"pdf-{vehicle_id}-{oem_code}".replace(" ", "_")[:64]

            if part_id in seen_ids:
                part_id = f"{part_id[:58]}-{uuid.uuid4().hex[:5]}"
            seen_ids.add(part_id)

            results.append(
                {
                    "id": part_id,
                    "assembly_id": assembly_id,
                    "pos_number": pos_number,
                    "oem_code": oem_code,
                    "name": name,
                    "manual_page": page_number,
                    "figure_code": figure_code,
                    "explode_vector_x": 0.0,
                    "explode_vector_y": 0.0,
                    "explode_vector_z": 0.0,
                }
            )
