"""
Fleet seed endpoint — idempotent POST /api/v1/seed/fleet

Seeds:
  Vehicles: Sinomach 722H, Iveco Tector 170E28, VW 17220, Bull HD96
  Shared subsystems: Cummins 6BT, ZF WG200, Dana Spicer M226, Rexroth A10VO
  Parts: 6 parts per assembly (24 total)
"""

from fastapi import APIRouter, status
from sqlalchemy import select

from app.core.database import DbSession
from app.models.sql_models import Assembly, Part, Vehicle, VehicleAssemblyAssociation

router = APIRouter(prefix="/seed", tags=["seed"])


# ─── Fleet data definitions ──────────────────────────────────────────────────

ASSEMBLIES_DATA = [
    {
        "id": "ASM-CUMMINS-6BT",
        "code": "6BT",
        "name": "Motor Diésel Cummins 6BT 5.9",
        "manufacturer": "Cummins",
        "category": "Motor",
        "model_glb_url": "/models/cummins_6bt.glb",
        "manual_pdf_url": "/manuals/cummins_6bt_service.pdf",
    },
    {
        "id": "ASM-ZF-WG200",
        "code": "WG200",
        "name": "Transmisión Automática ZF WG200",
        "manufacturer": "ZF",
        "category": "Transmisión",
        "model_glb_url": "/models/zf_wg200.glb",
        "manual_pdf_url": "/manuals/zf_wg200_service.pdf",
    },
    {
        "id": "ASM-DANA-M226",
        "code": "M226",
        "name": "Diferencial Dana Spicer M226",
        "manufacturer": "Dana Spicer",
        "category": "Diferencial",
        "model_glb_url": "/models/dana_m226.glb",
        "manual_pdf_url": "/manuals/dana_m226_service.pdf",
    },
    {
        "id": "ASM-REXROTH-A10VO",
        "code": "A10VO",
        "name": "Bomba Hidráulica Rexroth A10VO",
        "manufacturer": "Bosch Rexroth",
        "category": "Hidráulico",
        "model_glb_url": "/models/rexroth_a10vo.glb",
        "manual_pdf_url": "/manuals/rexroth_a10vo_service.pdf",
    },
]

PARTS_DATA: dict[str, list[dict]] = {
    "ASM-CUMMINS-6BT": [
        {"id": "P-6BT-001", "pos_number": 1, "oem_code": "CUM-3926872", "name": "Culata de Cilindros",       "category": "Cylinder Head",     "torque_spec": "163 Nm", "manual_page": 4,  "ex": -2.0, "ey": 0.8,  "ez": 0.0},
        {"id": "P-6BT-002", "pos_number": 2, "oem_code": "CUM-3929049", "name": "Bloque de Motor",            "category": "Block",             "torque_spec": None,     "manual_page": 5,  "ex": 0.0,  "ey": 0.0,  "ez": 0.0},
        {"id": "P-6BT-003", "pos_number": 3, "oem_code": "CUM-3923190", "name": "Cigüeñal 6 Cilindros",       "category": "Crankshaft",        "torque_spec": "135 Nm", "manual_page": 6,  "ex": 0.0,  "ey": -1.5, "ez": 0.0},
        {"id": "P-6BT-004", "pos_number": 4, "oem_code": "CUM-3802906", "name": "Árbol de Levas",             "category": "Camshaft",          "torque_spec": "68 Nm",  "manual_page": 7,  "ex": 0.0,  "ey": 1.5,  "ez": 0.0},
        {"id": "P-6BT-005", "pos_number": 5, "oem_code": "CUM-3929141", "name": "Bomba de Inyección Bosch",   "category": "Fuel System",       "torque_spec": "72 Nm",  "manual_page": 8,  "ex": 2.2,  "ey": 0.0,  "ez": 0.0},
        {"id": "P-6BT-006", "pos_number": 6, "oem_code": "CUM-3901892", "name": "Carter de Aceite",           "category": "Lubrication",       "torque_spec": "24 Nm",  "manual_page": 9,  "ex": 0.0,  "ey": -2.2, "ez": 0.0},
    ],
    "ASM-ZF-WG200": [
        {"id": "P-WG200-001", "pos_number": 1, "oem_code": "ZF-4644352112", "name": "Convertidor de Par",      "category": "Torque Converter",  "torque_spec": "55 Nm",  "manual_page": 3,  "ex": -2.0, "ey": 0.0,  "ez": 0.0},
        {"id": "P-WG200-002", "pos_number": 2, "oem_code": "ZF-4644352225", "name": "Carcasa Principal",        "category": "Housing",           "torque_spec": None,     "manual_page": 4,  "ex": 0.0,  "ey": 0.0,  "ez": 0.0},
        {"id": "P-WG200-003", "pos_number": 3, "oem_code": "ZF-4644353010", "name": "Planetario 1ª Etapa",      "category": "Planetary Gear",    "torque_spec": "110 Nm", "manual_page": 5,  "ex": 0.0,  "ey": 1.8,  "ez": 0.0},
        {"id": "P-WG200-004", "pos_number": 4, "oem_code": "ZF-4644353020", "name": "Planetario 2ª Etapa",      "category": "Planetary Gear",    "torque_spec": "110 Nm", "manual_page": 6,  "ex": 0.0,  "ey": -1.8, "ez": 0.0},
        {"id": "P-WG200-005", "pos_number": 5, "oem_code": "ZF-4644354001", "name": "Paquete de Frenos",        "category": "Brake Pack",        "torque_spec": "38 Nm",  "manual_page": 7,  "ex": 2.5,  "ey": 0.0,  "ez": 0.0},
        {"id": "P-WG200-006", "pos_number": 6, "oem_code": "ZF-4644355100", "name": "Módulo Electrónico TCU",   "category": "Electronics",       "torque_spec": "8 Nm",   "manual_page": 8,  "ex": 0.0,  "ey": 0.0,  "ez": -2.5},
    ],
    "ASM-DANA-M226": [
        {"id": "P-M226-001", "pos_number": 1, "oem_code": "DAN-110964",   "name": "Carcasa Diferencial",       "category": "Housing",           "torque_spec": "48 Nm",  "manual_page": 2,  "ex": -2.0, "ey": 0.0,  "ez": 0.0},
        {"id": "P-M226-002", "pos_number": 2, "oem_code": "DAN-113206",   "name": "Piñón de Ataque (Ring)",    "category": "Ring Gear",         "torque_spec": "95 Nm",  "manual_page": 3,  "ex": 0.0,  "ey": 1.8,  "ez": 0.0},
        {"id": "P-M226-003", "pos_number": 3, "oem_code": "DAN-110178",   "name": "Corona Dentada",            "category": "Crown Gear",        "torque_spec": "88 Nm",  "manual_page": 4,  "ex": 2.2,  "ey": 0.0,  "ez": 0.0},
        {"id": "P-M226-004", "pos_number": 4, "oem_code": "DAN-112450",   "name": "Semiejes de Transmisión",   "category": "Half Shafts",       "torque_spec": "75 Nm",  "manual_page": 5,  "ex": 0.0,  "ey": 0.0,  "ez": 2.8},
        {"id": "P-M226-005", "pos_number": 5, "oem_code": "DAN-109934",   "name": "Rodamiento de Empuje",      "category": "Thrust Bearing",    "torque_spec": "22 Nm",  "manual_page": 6,  "ex": 0.0,  "ey": -1.5, "ez": 0.0},
        {"id": "P-M226-006", "pos_number": 6, "oem_code": "DAN-111622",   "name": "Sello Viton Trasero",       "category": "Seal",              "torque_spec": None,     "manual_page": 7,  "ex": 0.0,  "ey": 0.0,  "ez": -2.2},
    ],
    "ASM-REXROTH-A10VO": [
        {"id": "P-A10VO-001", "pos_number": 1, "oem_code": "REX-R910929867", "name": "Bloque de Cilindros",     "category": "Cylinder Block",    "torque_spec": "68 Nm",  "manual_page": 3,  "ex": 0.0,  "ey": 0.0,  "ez": 0.0},
        {"id": "P-A10VO-002", "pos_number": 2, "oem_code": "REX-R910929868", "name": "Plato de Distribución",   "category": "Valve Plate",       "torque_spec": "45 Nm",  "manual_page": 4,  "ex": -2.0, "ey": 0.0,  "ez": 0.0},
        {"id": "P-A10VO-003", "pos_number": 3, "oem_code": "REX-R910929869", "name": "Pistones de Bombeo",      "category": "Pistons",           "torque_spec": "32 Nm",  "manual_page": 5,  "ex": 0.0,  "ey": 2.0,  "ez": 0.0},
        {"id": "P-A10VO-004", "pos_number": 4, "oem_code": "REX-R910929870", "name": "Plato Oscilante",         "category": "Swash Plate",       "torque_spec": "55 Nm",  "manual_page": 6,  "ex": 0.0,  "ey": -2.0, "ez": 0.0},
        {"id": "P-A10VO-005", "pos_number": 5, "oem_code": "REX-R910929871", "name": "Regulador de Presión",    "category": "Pressure Control",  "torque_spec": "18 Nm",  "manual_page": 7,  "ex": 2.5,  "ey": 0.0,  "ez": 0.0},
        {"id": "P-A10VO-006", "pos_number": 6, "oem_code": "REX-R910929872", "name": "Eje de Accionamiento",    "category": "Drive Shaft",       "torque_spec": "85 Nm",  "manual_page": 8,  "ex": 0.0,  "ey": 0.0,  "ez": 2.5},
    ],
}

VEHICLES_DATA = [
    {
        "id": "VH-SINOMACH-722H",
        "brand": "Sinomach",
        "model": "722H",
        "category": "Motoniveladoras",
        "internal_code": "MN-001",
        "year": 2021,
        "assemblies": [
            ("ASM-CUMMINS-6BT",   "Motor Principal"),
            ("ASM-ZF-WG200",      "Transmisión Central"),
        ],
    },
    {
        "id": "VH-IVECO-170E28",
        "brand": "Iveco",
        "model": "Tector 170E28",
        "category": "Camiones Volcadores",
        "internal_code": "CV-001",
        "year": 2019,
        "assemblies": [
            ("ASM-CUMMINS-6BT",   "Motor Principal"),
            ("ASM-DANA-M226",     "Diferencial Trasero"),
        ],
    },
    {
        "id": "VH-VW-17220",
        "brand": "Volkswagen",
        "model": "17.220",
        "category": "Camiones Volcadores",
        "internal_code": "CV-002",
        "year": 2020,
        "assemblies": [
            ("ASM-DANA-M226",     "Diferencial Trasero"),
            ("ASM-REXROTH-A10VO", "Sistema Hidráulico Vuelco"),
        ],
    },
    {
        "id": "VH-BULL-HD96",
        "brand": "Bull",
        "model": "HD96",
        "category": "Retroexcavadoras",
        "internal_code": "RX-001",
        "year": 2022,
        "assemblies": [
            ("ASM-CUMMINS-6BT",   "Motor Principal"),
            ("ASM-REXROTH-A10VO", "Sistema Hidráulico Brazo"),
            ("ASM-ZF-WG200",      "Transmisión Powershift"),
        ],
    },
]


# ─── Seed endpoint ────────────────────────────────────────────────────────────


@router.post(
    "/fleet",
    status_code=status.HTTP_200_OK,
    summary="Seed fleet vehicles, shared assemblies, and parts",
)
async def seed_fleet(db: DbSession) -> dict:
    """
    Idempotent fleet seed. Creates or updates 4 vehicles, 4 shared subsystems,
    and 24 parts (6 per assembly). Safe to call multiple times.
    """
    stats = {"assemblies": 0, "parts": 0, "vehicles": 0, "links": 0}

    # 1. Upsert assemblies
    for asm_data in ASSEMBLIES_DATA:
        asm_id = asm_data["id"]
        existing = await db.get(Assembly, asm_id)
        if existing:
            for k, v in asm_data.items():
                setattr(existing, k, v)
        else:
            db.add(Assembly(**asm_data))
            stats["assemblies"] += 1
    await db.flush()

    # 2. Upsert parts
    for asm_id, parts in PARTS_DATA.items():
        for p in parts:
            existing = await db.get(Part, p["id"])
            part_obj = Part(
                id=p["id"],
                assembly_id=asm_id,
                pos_number=p["pos_number"],
                oem_code=p["oem_code"],
                name=p["name"],
                category=p["category"],
                torque_spec=p.get("torque_spec"),
                manual_page=p["manual_page"],
                explode_vector_x=p["ex"],
                explode_vector_y=p["ey"],
                explode_vector_z=p["ez"],
            )
            if existing:
                for field in ["pos_number", "oem_code", "name", "category", "torque_spec",
                               "manual_page", "explode_vector_x", "explode_vector_y", "explode_vector_z"]:
                    setattr(existing, field, getattr(part_obj, field))
            else:
                db.add(part_obj)
                stats["parts"] += 1
    await db.flush()

    # 3. Upsert vehicles
    for vh_data in VEHICLES_DATA:
        vh_id = vh_data["id"]
        existing_vh = await db.get(Vehicle, vh_id)
        if existing_vh:
            for k, v in vh_data.items():
                if k != "assemblies":
                    setattr(existing_vh, k, v)
        else:
            new_vh = Vehicle(
                id=vh_id,
                brand=vh_data["brand"],
                model=vh_data["model"],
                category=vh_data["category"],
                internal_code=vh_data["internal_code"],
                year=vh_data["year"],
            )
            db.add(new_vh)
            stats["vehicles"] += 1
        await db.flush()

        # 4. Upsert vehicle↔assembly links
        for asm_id, position in vh_data["assemblies"]:
            stmt = select(VehicleAssemblyAssociation).where(
                VehicleAssemblyAssociation.vehicle_id == vh_id,
                VehicleAssemblyAssociation.assembly_id == asm_id,
            )
            result = await db.execute(stmt)
            link = result.scalar_one_or_none()
            if not link:
                db.add(VehicleAssemblyAssociation(
                    vehicle_id=vh_id,
                    assembly_id=asm_id,
                    installed_position=position,
                ))
                stats["links"] += 1

    await db.commit()

    return {
        "status": "ok",
        "message": "Fleet seed completed successfully",
        "created": stats,
        "total": {
            "vehicles": len(VEHICLES_DATA),
            "assemblies": len(ASSEMBLIES_DATA),
            "parts": sum(len(v) for v in PARTS_DATA.values()),
        },
    }
