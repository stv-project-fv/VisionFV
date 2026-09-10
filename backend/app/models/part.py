from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.assembly import Assembly


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    assembly_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assemblies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    oem_code: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    # 3D Explode vector [x, y, z] in standard SI units
    explode_vector: Mapped[list[float]] = mapped_column(JSON, default=list, nullable=False)
    torque_spec: Mapped[str | None] = mapped_column(String(64), nullable=True)  # e.g., "45 Nm"
    manual_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    assembly: Mapped["Assembly"] = relationship("Assembly", back_populates="parts")
