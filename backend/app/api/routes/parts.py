from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.database import DbSession
from app.models.pydantic_schemas import PartCreate, PartResponse
from app.models.sql_models import Assembly, Part

router = APIRouter(prefix="/parts", tags=["parts"])


@router.get("", response_model=list[PartResponse], summary="List parts")
async def list_parts(
    db: DbSession,
    assembly_id: str | None = None,
    skip: int = 0,
    limit: int = 200,
) -> list[Part]:
    """Retrieves parts, optionally filtered by assembly ID."""
    stmt = select(Part)
    if assembly_id:
        stmt = stmt.where(Part.assembly_id == assembly_id)
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "",
    response_model=PartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create part",
)
async def create_part(
    payload: PartCreate,
    db: DbSession,
) -> Part:
    """Registers a new part belonging to an assembly."""
    assembly = await db.get(Assembly, payload.assembly_id)
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "detail": f"Parent Assembly '{payload.assembly_id}' not found",
                "code": "ASSEMBLY_NOT_FOUND",
            },
        )
    existing = await db.get(Part, payload.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"detail": f"Part '{payload.id}' already exists", "code": "PART_EXISTS"},
        )
    part = Part(**payload.model_dump())
    db.add(part)
    await db.commit()
    await db.refresh(part)
    return part


@router.get("/{part_id}", response_model=PartResponse, summary="Get part by ID")
async def get_part(
    part_id: str,
    db: DbSession,
) -> Part:
    """Retrieves a single part by ID."""
    part = await db.get(Part, part_id)
    if not part:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"detail": f"Part '{part_id}' not found", "code": "PART_NOT_FOUND"},
        )
    return part
