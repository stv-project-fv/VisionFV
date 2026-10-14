"""
manuals.py
~~~~~~~~~~
Endpoints for uploading, listing, and serving vehicle PDF manuals.

Routes:
    POST   /manuals/upload              Upload a PDF manual and optionally extract eBOM.
    GET    /manuals/vehicle/{vehicle_id} List all manuals for a vehicle.
    GET    /manuals/file/{manual_id}    Stream the PDF file.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import DbSession
from app.models.pydantic_schemas import ManualDocumentResponse, UploadManualResponse
from app.models.sql_models import Assembly, DocumentType, ManualDocument, Part, Vehicle
from app.services.pdf_extractor import extract_parts_from_pdf

router = APIRouter(prefix="/manuals", tags=["manuals"])

# Directory where uploaded PDFs are stored (relative to the project root)
UPLOADS_BASE = Path(__file__).resolve().parents[4] / "uploads" / "manuals"


# ---------------------------------------------------------------------------
# POST /manuals/upload
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=UploadManualResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF manual for a vehicle",
)
async def upload_manual(
    db: DbSession,
    file: UploadFile,
    vehicle_id: str = Form(..., description="Target vehicle ID"),
    doc_type: str = Form(..., description="PARTS_MANUAL | OPERATION_MANUAL"),
    title: str = Form(..., description="Human-readable title for this document"),
) -> UploadManualResponse:
    # ── Validate doc_type ──────────────────────────────────────────────────
    try:
        doc_type_enum = DocumentType(doc_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"detail": f"Invalid doc_type '{doc_type}'", "code": "INVALID_DOC_TYPE"},
        )

    # ── Validate vehicle exists ─────────────────────────────────────────────
    vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = vehicle_result.scalar_one_or_none()
    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": f"Vehicle '{vehicle_id}' not found", "code": "VEHICLE_NOT_FOUND"},
        )

    # ── Save file to disk ───────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Uploaded file has no filename", "code": "MISSING_FILENAME"},
        )

    vehicle_upload_dir = UPLOADS_BASE / vehicle_id
    vehicle_upload_dir.mkdir(parents=True, exist_ok=True)

    # Prefix with UUID to avoid collisions
    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    dest_path = vehicle_upload_dir / safe_filename

    content = await file.read()
    dest_path.write_bytes(content)

    # ── Count pages (best-effort) ───────────────────────────────────────────
    total_pages = 0
    try:
        import pdfplumber  # type: ignore[import-untyped]
        with pdfplumber.open(str(dest_path)) as pdf:
            total_pages = len(pdf.pages)
    except Exception:  # noqa: BLE001
        pass

    # ── Persist ManualDocument record ──────────────────────────────────────
    manual_id = uuid.uuid4().hex
    manual = ManualDocument(
        id=manual_id,
        vehicle_id=vehicle_id,
        doc_type=doc_type_enum.value,
        title=title,
        filename=file.filename,
        file_path=str(dest_path),
        total_pages=total_pages,
    )
    db.add(manual)

    # ── eBOM extraction (PARTS_MANUAL only) ────────────────────────────────
    parts_extracted = 0
    if doc_type_enum == DocumentType.PARTS_MANUAL:
        # Ensure a placeholder assembly exists for PDF-sourced parts
        assembly_id = f"{vehicle_id}-manual-bom"
        asm_result = await db.execute(select(Assembly).where(Assembly.id == assembly_id))
        assembly = asm_result.scalar_one_or_none()

        if assembly is None:
            assembly = Assembly(
                id=assembly_id,
                code="PDF-BOM",
                name=f"Catálogo de Repuestos — {title}",
                manufacturer="",
                category="Motor",
            )
            db.add(assembly)
            await db.flush()  # Persist assembly so FKs resolve

        part_dicts = extract_parts_from_pdf(str(dest_path), vehicle_id, assembly_id)

        for part_data in part_dicts:
            # Upsert: delete existing part with same ID, then insert
            existing = await db.execute(select(Part).where(Part.id == part_data["id"]))
            existing_part = existing.scalar_one_or_none()
            if existing_part is not None:
                await db.delete(existing_part)
                await db.flush()

            new_part = Part(**part_data)
            db.add(new_part)

        parts_extracted = len(part_dicts)

    try:
        await db.commit()
        await db.refresh(manual)
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"detail": "Database error while saving manual", "code": "DB_ERROR"},
        ) from exc

    return UploadManualResponse(
        manual=ManualDocumentResponse.model_validate(manual),
        parts_extracted=parts_extracted,
    )


# ---------------------------------------------------------------------------
# GET /manuals/vehicle/{vehicle_id}
# ---------------------------------------------------------------------------

@router.get(
    "/vehicle/{vehicle_id}",
    response_model=list[ManualDocumentResponse],
    summary="List all manuals for a vehicle",
)
async def list_vehicle_manuals(
    vehicle_id: str,
    db: DbSession,
) -> list[ManualDocumentResponse]:
    vehicle_result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    if vehicle_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": f"Vehicle '{vehicle_id}' not found", "code": "VEHICLE_NOT_FOUND"},
        )

    result = await db.execute(
        select(ManualDocument)
        .where(ManualDocument.vehicle_id == vehicle_id)
        .order_by(ManualDocument.created_at.desc())
    )
    manuals = result.scalars().all()
    return [ManualDocumentResponse.model_validate(m) for m in manuals]


# ---------------------------------------------------------------------------
# GET /manuals/file/{manual_id}
# ---------------------------------------------------------------------------

@router.get(
    "/file/{manual_id}",
    summary="Stream a manual PDF file",
)
async def get_manual_file(
    manual_id: str,
    db: DbSession,
) -> FileResponse:
    result = await db.execute(select(ManualDocument).where(ManualDocument.id == manual_id))
    manual = result.scalar_one_or_none()
    if manual is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": f"Manual '{manual_id}' not found", "code": "MANUAL_NOT_FOUND"},
        )

    file_path = Path(manual.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": "PDF file not found on disk", "code": "FILE_NOT_FOUND"},
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=manual.filename,
        headers={"Content-Disposition": f'inline; filename="{manual.filename}"'},
    )
