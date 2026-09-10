from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.database import DbSession
from app.models.pydantic_schemas import (
    AssemblyCreate,
    AssemblyDetailResponse,
    AssemblyResponse,
    BatchPartImportRequest,
    PartResponse,
)
from app.models.sql_models import Assembly, Part

router = APIRouter(prefix="/assemblies", tags=["assemblies"])


@router.get("", response_model=list[AssemblyResponse], summary="List available assemblies")
async def list_assemblies(
    db: DbSession,
    category: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Assembly]:
    """Retrieves list of all registered mechanical assemblies, optionally filtered by category."""
    stmt = select(Assembly).offset(skip).limit(limit)
    if category:
        stmt = stmt.where(Assembly.category == category)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "",
    response_model=AssemblyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create assembly",
)
async def create_assembly(
    payload: AssemblyCreate,
    db: DbSession,
) -> Assembly:
    """Registers a new mechanical subsystem assembly."""
    existing = await db.get(Assembly, payload.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "detail": f"Assembly with id '{payload.id}' already exists",
                "code": "ASSEMBLY_EXISTS",
            },
        )
    assembly = Assembly(**payload.model_dump())
    db.add(assembly)
    await db.commit()
    await db.refresh(assembly)
    return assembly


@router.get(
    "/{assembly_id}",
    response_model=AssemblyDetailResponse,
    summary="Get assembly details with full eBOM",
)
async def get_assembly_detail(
    assembly_id: str,
    db: DbSession,
) -> Assembly:
    """Retrieves detailed information for a subsystem including all parts (eBOM)."""
    assembly = await db.get(Assembly, assembly_id)
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "detail": f"Assembly '{assembly_id}' not found",
                "code": "ASSEMBLY_NOT_FOUND",
            },
        )
    return assembly


@router.post(
    "/batch/parts",
    response_model=list[PartResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Batch import parts (used by ingestion scripts)",
)
async def batch_import_parts(
    payload: BatchPartImportRequest,
    db: DbSession,
) -> list[Part]:
    """Upserts a batch of parts linked to the given assembly_id."""
    assembly = await db.get(Assembly, payload.assembly_id)
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": f"Assembly '{payload.assembly_id}' not found"},
        )

    if payload.overwrite_existing:
        stmt = select(Part).where(Part.assembly_id == payload.assembly_id)
        result = await db.execute(stmt)
        for part in result.scalars().all():
            await db.delete(part)
        await db.flush()

    created: list[Part] = []
    for part_data in payload.parts:
        existing_part = await db.get(Part, part_data.id)
        if existing_part:
            for field, value in part_data.model_dump().items():
                setattr(existing_part, field, value)
            created.append(existing_part)
        else:
            new_part = Part(**part_data.model_dump())
            db.add(new_part)
            created.append(new_part)

    await db.commit()
    return created
