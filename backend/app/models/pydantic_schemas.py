from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# ── Enum literals (mirrors SQL enums) ────────────────────────────────────────

VehicleCategory = Literal[
    "Aplanadoras",
    "Autoelevadores",
    "Bateas",
    "Camionetas",
    "Camiones Caja Cerrada",
    "Camiones Hidroelevadores",
    "Camiones Tractores",
    "Camiones Volcadores",
    "Carretones",
    "Desmalezadoras",
    "Chipeadoras",
    "Excavadoras",
    "Minicargadoras",
    "Motoniveladoras",
    "Palas Cargadoras",
    "Retroexcavadoras",
    "Terminadoras de Asfalto",
    "Tractores",
    "Otros",
]

AssemblyCategory = Literal[
    "Motor",
    "Transmisión",
    "Diferencial",
    "Hidráulico",
    "Chasis",
]

# ── Part schemas ──────────────────────────────────────────────────────────────


class PartBase(BaseModel):
    pos_number: int | None = Field(default=None, ge=1, description="Position number in eBOM")
    oem_code: str = Field(..., description="OEM Part Reference Code")
    name: str = Field(..., description="Part descriptive name")
    category: str | None = Field(default=None, description="Component mechanical category")
    torque_spec: str | None = Field(default=None, description="Torque specification in Nm")
    manual_page: int | None = Field(
        default=None, ge=1, description="Associated service manual page"
    )
    explode_vector_x: float = Field(default=0.0, description="Explode direction X")
    explode_vector_y: float = Field(default=0.0, description="Explode direction Y")
    explode_vector_z: float = Field(default=0.0, description="Explode direction Z")


class PartCreate(PartBase):
    id: str = Field(..., description="Unique Part ID corresponding to 3D mesh node")
    assembly_id: str = Field(..., description="Parent assembly ID")


class PartResponse(PartBase):
    id: str
    assembly_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Batch ingestion ────────────────────────────────────────────────────────────


class BatchPartImportRequest(BaseModel):
    """Payload for programmatic bulk part upserts (used by ingestion scripts)."""

    assembly_id: str = Field(..., description="Target assembly ID")
    parts: list[PartCreate] = Field(..., min_length=1, description="Parts to upsert")
    overwrite_existing: bool = Field(
        default=False, description="If True, delete existing parts before inserting"
    )


# ── Assembly schemas ──────────────────────────────────────────────────────────


class AssemblyBase(BaseModel):
    code: str = Field(..., description="Short assembly code (e.g., 6BT, WG200)")
    name: str = Field(..., description="Assembly descriptive name")
    manufacturer: str = Field(default="", description="OEM manufacturer (e.g., Cummins, ZF)")
    category: AssemblyCategory = Field(default="Motor", description="Subsystem category")
    model_glb_url: str | None = Field(
        default=None, description="URL / static path to 3D glTF/GLB model"
    )
    manual_pdf_url: str | None = Field(
        default=None, description="URL / static path to service manual PDF"
    )


class AssemblyCreate(AssemblyBase):
    id: str = Field(..., description="Unique assembly identifier")


class AssemblyResponse(AssemblyBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssemblyDetailResponse(AssemblyResponse):
    parts: list[PartResponse] = Field(
        default_factory=list, description="List of all associated parts (eBOM)"
    )

    model_config = ConfigDict(from_attributes=True)


# ── Installed assembly (with position context) ────────────────────────────────


class InstalledAssemblyResponse(AssemblyResponse):
    """Assembly as installed in a specific vehicle, with position info."""

    installed_position: str = Field(..., description="Installation position on the vehicle")

    model_config = ConfigDict(from_attributes=True)


# ── Vehicle schemas ───────────────────────────────────────────────────────────


class VehicleBase(BaseModel):
    brand: str = Field(..., description="Vehicle manufacturer brand")
    model: str = Field(..., description="Vehicle model designation")
    category: VehicleCategory = Field(..., description="Fleet machinery category")
    internal_code: str = Field(..., description="Unique internal fleet identifier")
    year: int | None = Field(default=None, ge=1900, le=2100, description="Manufacturing year")


class VehicleCreate(VehicleBase):
    id: str = Field(..., description="Unique vehicle ID")


class VehicleResponse(VehicleBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VehicleDetailResponse(VehicleResponse):
    """Vehicle with all installed mechanical subsystems."""

    assemblies: list[InstalledAssemblyResponse] = Field(
        default_factory=list, description="List of installed mechanical subsystems"
    )

    model_config = ConfigDict(from_attributes=True)
