from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import DbSession
from app.models.pydantic_schemas import (
    InstalledAssemblyResponse,
    VehicleDetailResponse,
    VehicleResponse,
)
from app.models.sql_models import Vehicle, VehicleAssemblyAssociation

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleResponse], summary="List fleet vehicles")
async def list_vehicles(
    db: DbSession,
    category: str | None = None,
    skip: int = 0,
    limit: int = 200,
) -> list[Vehicle]:
    """Lists all fleet units. Optionally filter by machinery category."""
    stmt = select(Vehicle).offset(skip).limit(limit)
    if category:
        stmt = stmt.where(Vehicle.category == category)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get(
    "/{vehicle_id}",
    response_model=VehicleDetailResponse,
    summary="Get vehicle detail with installed assemblies",
)
async def get_vehicle_detail(
    vehicle_id: str,
    db: DbSession,
) -> VehicleDetailResponse:
    """Returns vehicle specs and all mechanically linked subsystems."""
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "detail": f"Vehicle '{vehicle_id}' not found",
                "code": "VEHICLE_NOT_FOUND",
            },
        )

    # Load association links with eager-loaded assembly (avoids MissingGreenlet)
    stmt = (
        select(VehicleAssemblyAssociation)
        .where(VehicleAssemblyAssociation.vehicle_id == vehicle_id)
        .options(selectinload(VehicleAssemblyAssociation.assembly))
    )
    result = await db.execute(stmt)
    links = result.scalars().all()

    installed: list[InstalledAssemblyResponse] = []
    for link in links:
        asm = link.assembly
        installed.append(
            InstalledAssemblyResponse(
                id=asm.id,
                code=asm.code,
                name=asm.name,
                manufacturer=asm.manufacturer,
                category=asm.category,  # type: ignore[arg-type]
                model_glb_url=asm.model_glb_url,
                manual_pdf_url=asm.manual_pdf_url,
                installed_position=link.installed_position,
                created_at=asm.created_at,
                updated_at=asm.updated_at,
            )
        )

    return VehicleDetailResponse(
        id=vehicle.id,
        brand=vehicle.brand,
        model=vehicle.model,
        category=vehicle.category,  # type: ignore[arg-type]
        internal_code=vehicle.internal_code,
        year=vehicle.year,
        assemblies=installed,
        created_at=vehicle.created_at,
        updated_at=vehicle.updated_at,
    )
