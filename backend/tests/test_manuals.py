"""Tests for /manuals endpoints."""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sql_models import Vehicle
from tests.conftest import test_async_session_factory


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _minimal_pdf() -> bytes:
    """Return a minimal valid 1-page PDF with no text/tables."""
    return (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF"
    )


async def _seed_vehicle() -> None:
    """Insert a test vehicle directly via the ORM."""
    async with test_async_session_factory() as session:
        session.add(
            Vehicle(
                id="VH-TEST-001",
                brand="Test",
                model="Unit",
                category="Tractores",
                internal_code="TST-001",
            )
        )
        await session.commit()


# ---------------------------------------------------------------------------
# Test: list manuals for unknown vehicle -> 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_manuals_unknown_vehicle(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/manuals/vehicle/DOES-NOT-EXIST")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Test: list manuals for known vehicle with no manuals -> empty list
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_manuals_empty(client: AsyncClient) -> None:
    await _seed_vehicle()
    resp = await client.get("/api/v1/manuals/vehicle/VH-TEST-001")
    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Test: upload minimal PDF (no tables) as OPERATION_MANUAL -> succeeds
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_operation_manual(client: AsyncClient) -> None:
    await _seed_vehicle()

    pdf_bytes = _minimal_pdf()
    resp = await client.post(
        "/api/v1/manuals/upload",
        files={"file": ("test_manual.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "vehicle_id": "VH-TEST-001",
            "doc_type": "OPERATION_MANUAL",
            "title": "Manual de Prueba",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["parts_extracted"] == 0
    assert body["manual"]["doc_type"] == "OPERATION_MANUAL"
    assert body["manual"]["vehicle_id"] == "VH-TEST-001"


# ---------------------------------------------------------------------------
# Test: upload minimal PDF as PARTS_MANUAL with no tables -> 0 parts, no exception
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_parts_manual_no_tables(client: AsyncClient) -> None:
    await _seed_vehicle()

    pdf_bytes = _minimal_pdf()
    resp = await client.post(
        "/api/v1/manuals/upload",
        files={"file": ("parts.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "vehicle_id": "VH-TEST-001",
            "doc_type": "PARTS_MANUAL",
            "title": "Catalogo Vacio",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["parts_extracted"] == 0


# ---------------------------------------------------------------------------
# Test: upload with invalid doc_type -> 422
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_upload_invalid_doc_type(client: AsyncClient) -> None:
    await _seed_vehicle()

    pdf_bytes = _minimal_pdf()
    resp = await client.post(
        "/api/v1/manuals/upload",
        files={"file": ("test.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "vehicle_id": "VH-TEST-001",
            "doc_type": "INVALID_TYPE",
            "title": "Bad Upload",
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test: after upload, list endpoint returns the manual
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_manuals_after_upload(client: AsyncClient) -> None:
    await _seed_vehicle()

    pdf_bytes = _minimal_pdf()
    await client.post(
        "/api/v1/manuals/upload",
        files={"file": ("doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "vehicle_id": "VH-TEST-001",
            "doc_type": "OPERATION_MANUAL",
            "title": "Doc",
        },
    )

    list_resp = await client.get("/api/v1/manuals/vehicle/VH-TEST-001")
    assert list_resp.status_code == 200
    manuals = list_resp.json()
    assert len(manuals) == 1
    assert manuals[0]["title"] == "Doc"


# ---------------------------------------------------------------------------
# Test: GET file for unknown manual -> 404
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_manual_file_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/manuals/file/NONEXISTENT-ID")
    assert resp.status_code == 404
