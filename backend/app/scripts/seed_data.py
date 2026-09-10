import asyncio
import logging

from app.core.database import Base, async_session_factory, engine
from app.models.sql_models import Assembly, Part

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_data")

SEED_ASSEMBLY_ID = "DIFF-REDUCER-01"

SAMPLE_ASSEMBLY = Assembly(
    id=SEED_ASSEMBLY_ID,
    name="Caja Reductora / Diferencial",
    model_glb_url="/models/differential_reducer.glb",
    manual_pdf_url="/manuals/diff_reducer_service_manual.pdf",
)

SAMPLE_PARTS = [
    Part(
        id="PART-CR-01",
        assembly_id=SEED_ASSEMBLY_ID,
        oem_code="DIF-8001-CR",
        name="Carcasa Principal de Transmisión",
        category="Housing / Estructura",
        torque_spec="48 Nm",
        manual_page=2,
        explode_vector_x=-2.0,
        explode_vector_y=0.0,
        explode_vector_z=0.0,
    ),
    Part(
        id="PART-CR-02",
        assembly_id=SEED_ASSEMBLY_ID,
        oem_code="DIF-8002-EJ",
        name="Eje de Entrada de Transmisión",
        category="Shafts / Ejes",
        torque_spec="65 Nm",
        manual_page=3,
        explode_vector_x=0.0,
        explode_vector_y=0.0,
        explode_vector_z=2.5,
    ),
    Part(
        id="PART-CR-03",
        assembly_id=SEED_ASSEMBLY_ID,
        oem_code="DIF-8003-EC",
        name="Engranaje Cónico (Piñón de Ataque)",
        category="Gears / Engranajes",
        torque_spec="85 Nm",
        manual_page=4,
        explode_vector_x=0.0,
        explode_vector_y=1.8,
        explode_vector_z=0.0,
    ),
    Part(
        id="PART-CR-04",
        assembly_id=SEED_ASSEMBLY_ID,
        oem_code="DIF-8004-CO",
        name="Corona Dentada de Diferencial",
        category="Gears / Engranajes",
        torque_spec="95 Nm",
        manual_page=5,
        explode_vector_x=2.2,
        explode_vector_y=0.0,
        explode_vector_z=0.0,
    ),
    Part(
        id="PART-CR-05",
        assembly_id=SEED_ASSEMBLY_ID,
        oem_code="DIF-8005-RR",
        name="Rodamiento de Rodillos Cónicos",
        category="Bearings / Rodamientos",
        torque_spec="25 Nm",
        manual_page=6,
        explode_vector_x=0.0,
        explode_vector_y=-1.5,
        explode_vector_z=0.0,
    ),
    Part(
        id="PART-CR-06",
        assembly_id=SEED_ASSEMBLY_ID,
        oem_code="DIF-8006-BR",
        name="Brida Retenedora con Sello Viton",
        category="Flanges & Seals / Bridas",
        torque_spec="32 Nm",
        manual_page=7,
        explode_vector_x=0.0,
        explode_vector_y=0.0,
        explode_vector_z=-2.2,
    ),
]


async def seed() -> None:
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Seeding data into database...")
    async with async_session_factory() as session:
        # Check if assembly already exists
        existing_assembly = await session.get(Assembly, SEED_ASSEMBLY_ID)
        if existing_assembly:
            logger.info("Assembly '%s' already exists. Cleaning up old record...", SEED_ASSEMBLY_ID)
            await session.delete(existing_assembly)
            await session.commit()

        session.add(SAMPLE_ASSEMBLY)
        for part in SAMPLE_PARTS:
            session.add(part)

        await session.commit()
        logger.info(
            "Successfully seeded assembly '%s' with %d parts!",
            SAMPLE_ASSEMBLY.name,
            len(SAMPLE_PARTS),
        )

    await engine.dispose()


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
