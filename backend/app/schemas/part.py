from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PartBase(BaseModel):
    oem_code: str = Field(..., description="OEM Part Code / Manufacturer Reference")
    name: str = Field(..., description="Part descriptive name")
    description: str | None = Field(default=None, description="Detailed component description")
    quantity: int = Field(default=1, ge=1, description="Quantity per assembly")
    explode_vector: tuple[float, float, float] | list[float] = Field(
        default=[0.0, 0.0, 0.0],
        description="Explode direction and distance [x, y, z] in standard SI units",
    )
    torque_spec: str | None = Field(
        default=None, description="Torque specification in Nm (e.g. '25 Nm')"
    )
    manual_page: int | None = Field(
        default=None, ge=1, description="Associated page in service manual"
    )


class PartCreate(PartBase):
    id: str = Field(..., description="Unique Part ID matching glTF node mesh id")
    assembly_id: str = Field(..., description="Parent assembly ID")


class PartUpdate(BaseModel):
    oem_code: str | None = None
    name: str | None = None
    description: str | None = None
    quantity: int | None = Field(default=None, ge=1)
    explode_vector: tuple[float, float, float] | list[float] | None = None
    torque_spec: str | None = None
    manual_page: int | None = None


class PartResponse(PartBase):
    id: str
    assembly_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
