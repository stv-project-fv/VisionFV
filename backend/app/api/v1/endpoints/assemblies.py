from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.database import DbSession
from app.models.assembly import Assembly
from app.schemas.assembly import AssemblyCreate, AssemblyResponse, AssemblyUpdate

router = APIRouter(prefix="/assemblies", tags=["assemblies"])


@router.get("", response_model=list[AssemblyResponse])
async def list_assemblies(
    db: DbSession,
    skip: int = 0,
    limit: int = 100,
) -> list[Assembly]:
    stmt = select(Assembly).offset(skip).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=AssemblyResponse, status_code=status.HTTP_201_CREATED)
async def create_assembly(
    payload: AssemblyCreate,
    db: DbSession,
) -> Assembly:
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


@router.get("/{assembly_id}", response_model=AssemblyResponse)
async def get_assembly(
    assembly_id: str,
    db: DbSession,
) -> Assembly:
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


@router.patch("/{assembly_id}", response_model=AssemblyResponse)
async def update_assembly(
    assembly_id: str,
    payload: AssemblyUpdate,
    db: DbSession,
) -> Assembly:
    assembly = await db.get(Assembly, assembly_id)
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "detail": f"Assembly '{assembly_id}' not found",
                "code": "ASSEMBLY_NOT_FOUND",
            },
        )
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(assembly, key, value)
    await db.commit()
    await db.refresh(assembly)
    return assembly


@router.delete("/{assembly_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assembly(
    assembly_id: str,
    db: DbSession,
) -> None:
    assembly = await db.get(Assembly, assembly_id)
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "detail": f"Assembly '{assembly_id}' not found",
                "code": "ASSEMBLY_NOT_FOUND",
            },
        )
    await db.delete(assembly)
    await db.commit()
