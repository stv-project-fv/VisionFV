from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    pass

# ── Enumerations ─────────────────────────────────────────────────────────────

VEHICLE_CATEGORIES = (
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
)

ASSEMBLY_CATEGORIES = (
    "Motor",
    "Transmisión",
    "Diferencial",
    "Hidráulico",
    "Chasis",
)


# ── Join table: Vehicle ↔ Assembly (M2M) ──────────────────────────────────────

class VehicleAssemblyAssociation(Base):
    """Many-to-many association between vehicles and shared mechanical subsystems."""

    __tablename__ = "vehicle_assembly_associations"
    __table_args__ = (
        UniqueConstraint("vehicle_id", "assembly_id", name="uq_vehicle_assembly"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assembly_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assemblies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    installed_position: Mapped[str] = mapped_column(
        String(128), nullable=False, default="Principal"
    )

    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="assembly_links")
    assembly: Mapped["Assembly"] = relationship("Assembly", back_populates="vehicle_links")


# ── Vehicle ───────────────────────────────────────────────────────────────────

class Vehicle(Base):
    """Heavy machinery or commercial vehicle unit in the fleet."""

    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    brand: Mapped[str] = mapped_column(String(128), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(
        Enum(*VEHICLE_CATEGORIES, name="vehicle_category_enum"), nullable=False
    )
    internal_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationship via join table
    assembly_links: Mapped[list["VehicleAssemblyAssociation"]] = relationship(
        "VehicleAssemblyAssociation",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


# ── Assembly ──────────────────────────────────────────────────────────────────

class Assembly(Base):
    """Standardized mechanical subsystem shared across multiple vehicle types."""

    __tablename__ = "assemblies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    category: Mapped[str] = mapped_column(
        Enum(*ASSEMBLY_CATEGORIES, name="assembly_category_enum"), nullable=False, default="Motor"
    )
    model_glb_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    manual_pdf_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    parts: Mapped[list["Part"]] = relationship(
        "Part", back_populates="assembly", cascade="all, delete-orphan", lazy="selectin"
    )
    vehicle_links: Mapped[list["VehicleAssemblyAssociation"]] = relationship(
        "VehicleAssemblyAssociation",
        back_populates="assembly",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


# ── Part ──────────────────────────────────────────────────────────────────────

class Part(Base):
    """Individual component within a mechanical assembly (eBOM line item)."""

    __tablename__ = "parts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    assembly_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assemblies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pos_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    oem_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    torque_spec: Mapped[str | None] = mapped_column(String(64), nullable=True)
    manual_page: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # 3D explode vectors
    explode_vector_x: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    explode_vector_y: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    explode_vector_z: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    assembly: Mapped["Assembly"] = relationship("Assembly", back_populates="parts")
