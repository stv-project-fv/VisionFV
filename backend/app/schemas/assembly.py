from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.part import PartResponse


class AssemblyBase(BaseModel):
    name: str = Field(..., description="Assembly name")
    description: str | None = Field(default=None, description="Assembly description")
    model_url: str | None = Field(default=None, description="URL or static path to glTF/GLB file")


class AssemblyCreate(AssemblyBase):
    id: str = Field(..., description="Unique assembly identifier")


class AssemblyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    model_url: str | None = None


class AssemblyResponse(AssemblyBase):
    id: str
    created_at: datetime
    updated_at: datetime
    parts: list[PartResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
