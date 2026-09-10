# backend/scripts/seed_fleet.py
import asyncio
import sys
from pathlib import Path

# Añadir el directorio raíz de backend al path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import async_session_factory, engine, Base
from app.models.sql_models import Vehicle, Assembly, Part, VehicleAssemblyAssociation

# ==============================================================================
# 1. DEFINICIÓN DE SUBSISTEMAS MAESTROS (ASSEMBLIES) Y SUS PIEZAS (eBOM)
# ==============================================================================

MASTER_ASSEMBLIES = [
    {
        "id": "ASM-ENG-CUMMINS-6CT",
        "code": "ENG-CUM-6CT83",
        "name": "Motor Diésel Cummins 6CT 8.3L / 6BT 5.9L",
        "manufacturer": "Cummins",
        "category": "Motor",
        "model_glb_url": "/assets/models/cummins_6ct.glb",
        "manual_pdf_url": "/assets/manuals/cummins_6ct_service.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "CUM-3901430", "name": "Bloque de Cilindros", "torque_spec": "N/A", "manual_page": 12, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 0.0},
            {"pos_number": 2, "oem_code": "CUM-3929037", "name": "Tapa de Cilindros", "torque_spec": "175 Nm + 90°", "manual_page": 24, "explode_vector_x": 0.0, "explode_vector_y": 1.2, "explode_vector_z": 0.0},
            {"pos_number": 3, "oem_code": "CUM-3802421", "name": "Kit Conjunto Pistón y Biela", "torque_spec": "100 Nm", "manual_page": 38, "explode_vector_x": 0.0, "explode_vector_y": 0.8, "explode_vector_z": 0.3},
            {"pos_number": 4, "oem_code": "CUM-3907803", "name": "Cigüeñal Forjado 6 Cil.", "torque_spec": "205 Nm", "manual_page": 44, "explode_vector_x": 0.0, "explode_vector_y": -0.9, "explode_vector_z": 0.0},
            {"pos_number": 5, "oem_code": "CUM-4935793", "name": "Turbocompresor Holset HX40W", "torque_spec": "45 Nm", "manual_page": 62, "explode_vector_x": 0.8, "explode_vector_y": 0.5, "explode_vector_z": 0.0},
            {"pos_number": 6, "oem_code": "CUM-3936316", "name": "Bomba de Inyección Bosch Inline", "torque_spec": "30 Nm", "manual_page": 78, "explode_vector_x": -0.8, "explode_vector_y": 0.2, "explode_vector_z": 0.0},
            {"pos_number": 7, "oem_code": "CUM-3286278", "name": "Bomba de Agua y Maza", "torque_spec": "24 Nm", "manual_page": 91, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 1.0},
        ]
    },
    {
        "id": "ASM-ENG-FPT-NEF6",
        "code": "ENG-FPT-NEF67",
        "name": "Motor FPT NEF 6 Cil. Common Rail (Tector)",
        "manufacturer": "FPT Industrial / Iveco",
        "category": "Motor",
        "model_glb_url": "/assets/models/fpt_nef6.glb",
        "manual_pdf_url": "/assets/manuals/iveco_tector_engine.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "FPT-504082931", "name": "Tapa de Cilindros 24V", "torque_spec": "70 Nm + 90° + 90°", "manual_page": 18, "explode_vector_x": 0.0, "explode_vector_y": 1.1, "explode_vector_z": 0.0},
            {"pos_number": 2, "oem_code": "FPT-504128307", "name": "Inyector Bosch Common Rail CRIN2", "torque_spec": "35 Nm", "manual_page": 32, "explode_vector_x": 0.0, "explode_vector_y": 1.5, "explode_vector_z": 0.0},
            {"pos_number": 3, "oem_code": "FPT-5801387474", "name": "Rampa de Inyección (Rail Alta Presión)", "torque_spec": "28 Nm", "manual_page": 35, "explode_vector_x": -0.6, "explode_vector_y": 0.8, "explode_vector_z": 0.0},
            {"pos_number": 4, "oem_code": "FPT-504063467", "name": "Bomba de Alta Presión CP3", "torque_spec": "50 Nm", "manual_page": 40, "explode_vector_x": -0.7, "explode_vector_y": -0.2, "explode_vector_z": 0.0},
        ]
    },
    {
        "id": "ASM-ENG-FPT-F1C",
        "code": "ENG-FPT-F1C30",
        "name": "Motor FPT F1C 3.0L HPI / HPT (Daily)",
        "manufacturer": "FPT Industrial / Iveco",
        "category": "Motor",
        "model_glb_url": "/assets/models/fpt_f1c.glb",
        "manual_pdf_url": "/assets/manuals/iveco_daily_f1c.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "FPT-504385573", "name": "Kit Cadena Distribución Primaria", "torque_spec": "65 Nm", "manual_page": 15, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 0.9},
            {"pos_number": 2, "oem_code": "FPT-504088823", "name": "Cuerpo Mariposa y Válvula EGR", "torque_spec": "22 Nm", "manual_page": 55, "explode_vector_x": 0.6, "explode_vector_y": 0.4, "explode_vector_z": 0.0},
        ]
    },
    {
        "id": "ASM-ENG-MWM-410",
        "code": "ENG-MWM-410TCA",
        "name": "Motor MWM 4.10 TCA / Acteon 4.12",
        "manufacturer": "MWM International",
        "category": "Motor",
        "model_glb_url": "/assets/models/mwm_410.glb",
        "manual_pdf_url": "/assets/manuals/mwm_410_service.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "MWM-941001100014", "name": "Bomba de Aceite Lubricante", "torque_spec": "25 Nm", "manual_page": 44, "explode_vector_x": 0.0, "explode_vector_y": -0.7, "explode_vector_z": 0.5},
            {"pos_number": 2, "oem_code": "MWM-941003400024", "name": "Válvula Termostática con Carcasa", "torque_spec": "18 Nm", "manual_page": 58, "explode_vector_x": 0.0, "explode_vector_y": 0.6, "explode_vector_z": 0.8},
        ]
    },
    {
        "id": "ASM-ENG-OM904",
        "code": "ENG-MB-OM904LA",
        "name": "Motor Mercedes-Benz OM 904 / OM 926 LA",
        "manufacturer": "Mercedes-Benz",
        "category": "Motor",
        "model_glb_url": "/assets/models/mb_om904.glb",
        "manual_pdf_url": "/assets/manuals/mb_om900_series.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "MB-A9040100520", "name": "Unidad de Bomba Individual PLD/UPS", "torque_spec": "40 Nm", "manual_page": 66, "explode_vector_x": -0.7, "explode_vector_y": 0.3, "explode_vector_z": 0.0},
            {"pos_number": 2, "oem_code": "MB-A9061800209", "name": "Módulo Radiador / Filtro de Aceite", "torque_spec": "30 Nm", "manual_page": 82, "explode_vector_x": 0.7, "explode_vector_y": 0.0, "explode_vector_z": 0.0},
        ]
    },
    {
        "id": "ASM-ENG-KUBOTA-V3300",
        "code": "ENG-KUB-V3300DI",
        "name": "Motor Diésel Compacto Industrial 4 Cil.",
        "manufacturer": "Kubota / Yanmar",
        "category": "Motor",
        "model_glb_url": "/assets/models/kubota_v3300.glb",
        "manual_pdf_url": "/assets/manuals/kubota_industrial_service.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "KUB-1C010-12110", "name": "Múltiple de Admisión y Escape", "torque_spec": "28 Nm", "manual_page": 19, "explode_vector_x": 0.6, "explode_vector_y": 0.3, "explode_vector_z": 0.0},
            {"pos_number": 2, "oem_code": "KUB-15221-42520", "name": "Termostato y Brida", "torque_spec": "15 Nm", "manual_page": 31, "explode_vector_x": 0.0, "explode_vector_y": 0.5, "explode_vector_z": 0.5},
        ]
    },
    {
        "id": "ASM-TRA-ZF-WG200",
        "code": "TRA-ZF-WG200PS",
        "name": "Transmisión Powershift ZF WG180 / WG200",
        "manufacturer": "ZF Friedrichshafen",
        "category": "Transmisión",
        "model_glb_url": "/assets/models/zf_wg200.glb",
        "manual_pdf_url": "/assets/manuals/zf_wg200_repair.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "ZF-0501210884", "name": "Válvula de Control Electrohidráulico", "torque_spec": "24 Nm", "manual_page": 45, "explode_vector_x": 0.0, "explode_vector_y": 1.0, "explode_vector_z": 0.0},
            {"pos_number": 2, "oem_code": "ZF-0501315662", "name": "Paquete de Embrague Multidisco K1", "torque_spec": "N/A", "manual_page": 60, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 0.9},
            {"pos_number": 3, "oem_code": "ZF-0750115234", "name": "Convertidor de Par Hidrodinámico W330", "torque_spec": "55 Nm", "manual_page": 22, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": -1.1},
        ]
    },
    {
        "id": "ASM-TRA-EATON-FS",
        "code": "TRA-EAT-FS5406A",
        "name": "Transmisión Manual Eaton Fuller / ZF S5-42",
        "manufacturer": "Eaton / ZF",
        "category": "Transmisión",
        "model_glb_url": "/assets/models/eaton_fs5406.glb",
        "manual_pdf_url": "/assets/manuals/eaton_medium_duty.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "EAT-3315724", "name": "Torre de Selectora de Marchas", "torque_spec": "35 Nm", "manual_page": 14, "explode_vector_x": 0.0, "explode_vector_y": 1.1, "explode_vector_z": 0.0},
            {"pos_number": 2, "oem_code": "EAT-4301851", "name": "Horquilla de Sincronizado 3ra/4ta", "torque_spec": "45 Nm", "manual_page": 28, "explode_vector_x": 0.4, "explode_vector_y": 0.4, "explode_vector_z": 0.0},
        ]
    },
    {
        "id": "ASM-DIF-DANA-SPICER",
        "code": "DIF-DANA-S130",
        "name": "Diferencial de Eje Trasero Pesado",
        "manufacturer": "Dana Spicer / Meritor",
        "category": "Diferencial",
        "model_glb_url": "/assets/models/dana_spicer_diff.glb",
        "manual_pdf_url": "/assets/manuals/spicer_rear_axle.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "DAN-KIT-1004", "name": "Corona y Piñón de Ataque Hipoide", "torque_spec": "220 Nm", "manual_page": 18, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": -0.8},
            {"pos_number": 2, "oem_code": "DAN-BEAR-32014", "name": "Rodamiento de Rodillos Cónicos", "torque_spec": "Precarga 3-5 Nm", "manual_page": 25, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": -1.2},
            {"pos_number": 3, "oem_code": "DAN-504221", "name": "Caja de Satélites y Planetarios", "torque_spec": "95 Nm", "manual_page": 33, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 0.6},
        ]
    },
    {
        "id": "ASM-HYD-REXROTH-A10",
        "code": "HYD-REX-A10VO71",
        "name": "Bomba Hidráulica de Pistones Axiales de Caudal Variable",
        "manufacturer": "Bosch Rexroth / Parker",
        "category": "Hidráulico",
        "model_glb_url": "/assets/models/rexroth_a10vo.glb",
        "manual_pdf_url": "/assets/manuals/rexroth_a10_manual.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "REX-R902405412", "name": "Bloque de Cilindros Rotativo", "torque_spec": "N/A", "manual_page": 15, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 0.8},
            {"pos_number": 2, "oem_code": "REX-R909444321", "name": "Conjunto 9 Pistones y Placa de Retención", "torque_spec": "N/A", "manual_page": 19, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 1.2},
            {"pos_number": 3, "oem_code": "REX-R902008741", "name": "Plato Oscilante Basculante (Swashplate)", "torque_spec": "65 Nm", "manual_page": 27, "explode_vector_x": 0.0, "explode_vector_y": 0.5, "explode_vector_z": 0.4},
            {"pos_number": 4, "oem_code": "REX-R902603310", "name": "Válvula Reguladora de Presión DFR1", "torque_spec": "35 Nm", "manual_page": 40, "explode_vector_x": 0.7, "explode_vector_y": 0.4, "explode_vector_z": 0.0},
        ]
    },
    {
        "id": "ASM-ELE-DRIVE-AC",
        "code": "ELE-DRV-48V5KW",
        "name": "Tren de Potencia Eléctrico AC y Dirección Hidráulica",
        "manufacturer": "Doosan / Curtis",
        "category": "Chasis",
        "model_glb_url": "/assets/models/electric_powertrain.glb",
        "manual_pdf_url": "/assets/manuals/forklift_electric_drive.pdf",
        "parts": [
            {"pos_number": 1, "oem_code": "CURT-1234AC", "name": "Controlador de Tracción Inverter 48V", "torque_spec": "9 Nm", "manual_page": 12, "explode_vector_x": 0.0, "explode_vector_y": 0.8, "explode_vector_z": 0.0},
            {"pos_number": 2, "oem_code": "DRV-MOT-AC5K", "name": "Motor Asincrónico Trifásico Blindado", "torque_spec": "45 Nm", "manual_page": 28, "explode_vector_x": 0.0, "explode_vector_y": 0.0, "explode_vector_z": 0.7},
        ]
    }
]

# ==============================================================================
# 2. DEFINICIÓN DEL PARQUE AUTOMOTOR (VEHICLES & SUBSYSTEM MAPPINGS)
# ==============================================================================

VEHICLES_SEED = [
    # --- Aplanadoras ---
    {"brand": "Ammann", "model": "ARX 40K", "category": "Aplanadoras", "internal_code": "APL-01", "year": 2018,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Diésel Compacto"), ("ASM-HYD-REXROTH-A10", "Bomba Hidrostática de Tracción/Vibración")]},
    {"brand": "Sakai", "model": "TW502-1", "category": "Aplanadoras", "internal_code": "APL-02", "year": 2017,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Diésel Compacto"), ("ASM-HYD-REXROTH-A10", "Sistema Hidráulico de Compactación")]},

    # --- Autoelevadores ---
    {"brand": "Doosan", "model": "Autoelevador Eléctrico 133-B15NS", "category": "Autoelevadores", "internal_code": "AUT-01", "year": 2020,
     "assemblies": [("ASM-ELE-DRIVE-AC", "Módulo Inverter y Motor Eléctrico"), ("ASM-HYD-REXROTH-A10", "Centralina Hidráulica de Elevación")]},
    {"brand": "Hangcha", "model": "Autoelevador Eléctrico 111-CPD18", "category": "Autoelevadores", "internal_code": "AUT-02", "year": 2021,
     "assemblies": [("ASM-ELE-DRIVE-AC", "Tren de Potencia AC"), ("ASM-HYD-REXROTH-A10", "Bomba Hidráulica de Mástil")]},

    # --- Bateas ---
    {"brand": "Petinari", "model": "Semiremolque BD 3 E/2010", "category": "Bateas", "internal_code": "BAT-01", "year": 2010,
     "assemblies": [("ASM-HYD-REXROTH-A10", "Cilindro Telescópico y Válvula de Volteo")]},

    # --- Camionetas ---
    {"brand": "Chevrolet", "model": "S-10 DC 2.8 CDTI 4X4 LS", "category": "Camionetas", "internal_code": "CAM-01", "year": 2019,
     "assemblies": [("ASM-ENG-MWM-410", "Motor 2.8 Turbo Diésel"), ("ASM-DIF-DANA-SPICER", "Diferencial Trasero 4x4")]},
    {"brand": "Chevrolet", "model": "S-10 CS 2.8L", "category": "Camionetas", "internal_code": "CAM-02", "year": 2015,
     "assemblies": [("ASM-ENG-MWM-410", "Motor 2.8L Diésel"), ("ASM-DIF-DANA-SPICER", "Eje Trasero Rígido")]},
    {"brand": "Chevrolet", "model": "S10", "category": "Camionetas", "internal_code": "CAM-03", "year": 2012,
     "assemblies": [("ASM-ENG-MWM-410", "Motor MWM Sprint 2.8"), ("ASM-DIF-DANA-SPICER", "Diferencial Trasero")]},
    {"brand": "Ford", "model": "F-100 XL Diesel", "category": "Camionetas", "internal_code": "CAM-04", "year": 2008,
     "assemblies": [("ASM-ENG-MWM-410", "Motor MWM 4.07TCA"), ("ASM-TRA-EATON-FS", "Caja Manual 5V"), ("ASM-DIF-DANA-SPICER", "Diferencial Dana 44/70")]},
    {"brand": "Ford", "model": "Ranger 2 DC 4x2 Safety 2.5", "category": "Camionetas", "internal_code": "CAM-05", "year": 2017,
     "assemblies": [("ASM-DIF-DANA-SPICER", "Diferencial Posterior")]},
    {"brand": "Ford", "model": "Ranger Pick-Up 2.2 TDI DC 4X2 L / 16XL", "category": "Camionetas", "internal_code": "CAM-06", "year": 2016,
     "assemblies": [("ASM-DIF-DANA-SPICER", "Eje Trasero Dana")]},
    {"brand": "Nissan", "model": "Frontier X-Gear 4X4 AT 2.3 D CD", "category": "Camionetas", "internal_code": "CAM-07", "year": 2021,
     "assemblies": [("ASM-DIF-DANA-SPICER", "Diferencial Multilink Trasero")]},
    {"brand": "Peugeot", "model": "Partner", "category": "Camionetas", "internal_code": "CAM-08", "year": 2018,
     "assemblies": [("ASM-TRA-EATON-FS", "Caja de Cambios Manual 5V")]},
    {"brand": "Toyota", "model": "Hilux Pick-Up 4X2 C/D DX Pack Eléctrico 2.5 TDI", "category": "Camionetas", "internal_code": "CAM-09", "year": 2015,
     "assemblies": [("ASM-DIF-DANA-SPICER", "Diferencial Trasero")]},

    # --- Camiones Caja Cerrada ---
    {"brand": "Iveco", "model": "Tector Attack 150E21N", "category": "Camiones Caja Cerrada", "internal_code": "CCC-01", "year": 2018,
     "assemblies": [("ASM-ENG-FPT-NEF6", "Motor FPT NEF 4/6"), ("ASM-TRA-EATON-FS", "Transmisión Eaton"), ("ASM-DIF-DANA-SPICER", "Eje Motriz Meritor/Dana")]},
    {"brand": "Iveco", "model": "Tector 110-190 DEE (Paso 3900)", "category": "Camiones Caja Cerrada", "internal_code": "CCC-02", "year": 2021,
     "assemblies": [("ASM-ENG-FPT-NEF6", "Motor FPT 4.5L"), ("ASM-TRA-EATON-FS", "Caja de Velocidades 6V")]},

    # --- Camiones Hidroelevadores ---
    {"brand": "Isuzu", "model": "NPR 4.8 TDI", "category": "Camiones Hidroelevadores", "internal_code": "HID-01", "year": 2016,
     "assemblies": [("ASM-HYD-REXROTH-A10", "Bomba Toma de Fuerza Hidroelevador"), ("ASM-TRA-EATON-FS", "Caja Manual")]},
    {"brand": "Iveco", "model": "Daily 35C14 Paso 3750", "category": "Camiones Hidroelevadores", "internal_code": "HID-02", "year": 2015,
     "assemblies": [("ASM-ENG-FPT-F1C", "Motor F1C 3.0L"), ("ASM-HYD-REXROTH-A10", "Sistema Hidráulico de Brazo")]},
    {"brand": "Iveco", "model": "Daily 55-170", "category": "Camiones Hidroelevadores", "internal_code": "HID-03", "year": 2019,
     "assemblies": [("ASM-ENG-FPT-F1C", "Motor F1C 170CV"), ("ASM-HYD-REXROTH-A10", "Bomba de Brazo Aislado")]},
    {"brand": "Iveco", "model": "Daily MY 55-170", "category": "Camiones Hidroelevadores", "internal_code": "HID-04", "year": 2021,
     "assemblies": [("ASM-ENG-FPT-F1C", "Motor F1C Euro 5"), ("ASM-HYD-REXROTH-A10", "Centralina de Brazo")]},
    {"brand": "Iveco", "model": "Daily 35-150", "category": "Camiones Hidroelevadores", "internal_code": "HID-05", "year": 2018,
     "assemblies": [("ASM-ENG-FPT-F1C", "Motor F1C 150CV"), ("ASM-HYD-REXROTH-A10", "Sistema Hidráulico")]},
    {"brand": "Mercedes Benz", "model": "Accelo 815", "category": "Camiones Hidroelevadores", "internal_code": "HID-06", "year": 2017,
     "assemblies": [("ASM-ENG-OM904", "Motor OM 924 LA"), ("ASM-TRA-EATON-FS", "Caja Eaton 5V"), ("ASM-HYD-REXROTH-A10", "Bomba de Brazo Articulado")]},

    # --- Camiones Tractores ---
    {"brand": "Mercedes Benz", "model": "L 1215/42", "category": "Camiones Tractores", "internal_code": "TRA-01", "year": 2002,
     "assemblies": [("ASM-ENG-OM904", "Motor OM 366 / OM 904"), ("ASM-TRA-EATON-FS", "Caja Manual G3"), ("ASM-DIF-DANA-SPICER", "Diferencial MB HL4")]},
    {"brand": "Mercedes Benz", "model": "Mod. 892-Axor 1933 S", "category": "Camiones Tractores", "internal_code": "TRA-02", "year": 2016,
     "assemblies": [("ASM-ENG-OM904", "Motor OM 926 LA 326CV"), ("ASM-DIF-DANA-SPICER", "Eje Trasero Reductor")]},
    {"brand": "Mercedes Benz", "model": "Camión Tractor c/ Cabina Dorm.", "category": "Camiones Tractores", "internal_code": "TRA-03", "year": 2012,
     "assemblies": [("ASM-ENG-OM904", "Motor OM 457 / 926"), ("ASM-DIF-DANA-SPICER", "Diferencial Pesado")]},
    {"brand": "Volkswagen", "model": "17220", "category": "Camiones Tractores", "internal_code": "TRA-04", "year": 2011,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6CTAA 8.3L"), ("ASM-TRA-EATON-FS", "Transmisión Eaton FS-6306"), ("ASM-DIF-DANA-SPICER", "Diferencial Meritor RS-23")]},

    # --- Camiones Volcadores ---
    {"brand": "Iveco", "model": "Tector Attack 170E22", "category": "Camiones Volcadores", "internal_code": "VOL-01", "year": 2016,
     "assemblies": [("ASM-ENG-FPT-NEF6", "Motor FPT NEF 6"), ("ASM-TRA-EATON-FS", "Caja Eaton 6V"), ("ASM-DIF-DANA-SPICER", "Diferencial Meritor"), ("ASM-HYD-REXROTH-A10", "Bomba Hidráulica de Volteo")]},
    {"brand": "Iveco", "model": "Tector Evo 170E28", "category": "Camiones Volcadores", "internal_code": "VOL-02", "year": 2020,
     "assemblies": [("ASM-ENG-FPT-NEF6", "Motor NEF 6 Common Rail 280CV"), ("ASM-TRA-EATON-FS", "Caja Eaton Manual"), ("ASM-DIF-DANA-SPICER", "Eje Meritor MS 23-245"), ("ASM-HYD-REXROTH-A10", "Válvula de Volteo")]},
    {"brand": "Iveco", "model": "Tector Attack 150E21N", "category": "Camiones Volcadores", "internal_code": "VOL-03", "year": 2017,
     "assemblies": [("ASM-ENG-FPT-NEF6", "Motor FPT NEF4"), ("ASM-TRA-EATON-FS", "Caja 6V"), ("ASM-HYD-REXROTH-A10", "Toma de Fuerza y Bomba")]},
    {"brand": "Iveco", "model": "170-210", "category": "Camiones Volcadores", "internal_code": "VOL-04", "year": 2021,
     "assemblies": [("ASM-ENG-FPT-NEF6", "Motor FPT 4.5L 206CV"), ("ASM-TRA-EATON-FS", "Caja Eaton"), ("ASM-HYD-REXROTH-A10", "Cilindro Volcador")]},
    {"brand": "Iveco", "model": "170-280", "category": "Camiones Volcadores", "internal_code": "VOL-05", "year": 2022,
     "assemblies": [("ASM-ENG-FPT-NEF6", "Motor FPT NEF6 280CV"), ("ASM-TRA-EATON-FS", "Caja 9 Velocidades"), ("ASM-HYD-REXROTH-A10", "Circuito Hidráulico")]},
    {"brand": "Volkswagen", "model": "13-180", "category": "Camiones Volcadores", "internal_code": "VOL-06", "year": 2009,
     "assemblies": [("ASM-ENG-MWM-410", "Motor MWM 4.10 TCA"), ("ASM-TRA-EATON-FS", "Caja Eaton FS-4205"), ("ASM-DIF-DANA-SPICER", "Eje Trasero Dana 284"), ("ASM-HYD-REXROTH-A10", "Sistema Hidráulico")]},

    # --- Carretones y Desmalezadoras ---
    {"brand": "Comar", "model": "S8-25", "category": "Carretones", "internal_code": "CRT-01", "year": 2014, "assemblies": []},
    {"brand": "Genérico", "model": "Carretón Vial", "category": "Carretones", "internal_code": "CRT-02", "year": 2010, "assemblies": []},
    {"brand": "Grass Cutter", "model": "JAB 1500", "category": "Desmalezadoras", "internal_code": "DES-01", "year": 2018,
     "assemblies": [("ASM-DIF-DANA-SPICER", "Caja Multiplicadora de Cuchillas")]},
    {"brand": "Genérico", "model": "Desmalezadora de Arrastre", "category": "Desmalezadoras", "internal_code": "DES-02", "year": 2015,
     "assemblies": [("ASM-DIF-DANA-SPICER", "Caja Reductora Central")]},

    # --- Chipeadoras ---
    {"brand": "Bandit", "model": "150 XP", "category": "Chipeadoras", "internal_code": "CHP-01", "year": 2016,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Diésel Industrial"), ("ASM-HYD-REXROTH-A10", "Rodillos Hidráulicos de Alimentación")]},
    {"brand": "Eco", "model": "C120", "category": "Chipeadoras", "internal_code": "CHP-02", "year": 2019,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Diésel"), ("ASM-HYD-REXROTH-A10", "Válvula de Tracción de Alimentación")]},

    # --- Excavadoras ---
    {"brand": "Caterpillar", "model": "Oruga 320L", "category": "Excavadoras", "internal_code": "EXC-01", "year": 2008,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cat 3066/C6.4"), ("ASM-HYD-REXROTH-A10", "Bomba Principal Tandem Doble")]},
    {"brand": "Zoomlion", "model": "ZE 230E", "category": "Excavadoras", "internal_code": "EXC-02", "year": 2019,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6BTAA 5.9"), ("ASM-HYD-REXROTH-A10", "Bomba de Pistones Kawasaki/Rexroth")]},

    # --- Minicargadoras ---
    {"brand": "Hyundai", "model": "HSL850", "category": "Minicargadoras", "internal_code": "MIN-01", "year": 2017,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Kubota V3300"), ("ASM-HYD-REXROTH-A10", "Bomba Hidrostática de Tracción")]},
    {"brand": "New Holland", "model": "L318", "category": "Minicargadoras", "internal_code": "MIN-02", "year": 2021,
     "assemblies": [("ASM-ENG-FPT-F1C", "Motor FPT F5C"), ("ASM-HYD-REXROTH-A10", "Circuito Hidráulico de Carga")]},
    {"brand": "Wecan", "model": "GM 650", "category": "Minicargadoras", "internal_code": "MIN-03", "year": 2018,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Diésel 4 Cil."), ("ASM-HYD-REXROTH-A10", "Bombas en Tándem")]},

    # --- Motoniveladoras ---
    {"brand": "Astarsa", "model": "AAPY165C", "category": "Motoniveladoras", "internal_code": "MOT-01", "year": 2011,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6CTA 8.3"), ("ASM-TRA-ZF-WG200", "Transmisión ZF WG180"), ("ASM-HYD-REXROTH-A10", "Válvulas de Hoja y Vertedera")]},
    {"brand": "Champion", "model": "720", "category": "Motoniveladoras", "internal_code": "MOT-02", "year": 1998,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6CT 8.3"), ("ASM-TRA-ZF-WG200", "Transmisión Powershift"), ("ASM-HYD-REXROTH-A10", "Bomba Hidráulica Central")]},
    {"brand": "Changlin", "model": "717H", "category": "Motoniveladoras", "internal_code": "MOT-03", "year": 2016,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6BTA 5.9"), ("ASM-TRA-ZF-WG200", "Transmisión ZF WG180"), ("ASM-HYD-REXROTH-A10", "Distribuidor de Válvulas")]},
    {"brand": "Cheng-Gong", "model": "MG1320C", "category": "Motoniveladoras", "internal_code": "MOT-04", "year": 2013,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6CT 8.3"), ("ASM-TRA-ZF-WG200", "Caja ZF Powershift"), ("ASM-HYD-REXROTH-A10", "Bomba Hidráulica Principal")]},
    {"brand": "Lutong", "model": "PY165C", "category": "Motoniveladoras", "internal_code": "MOT-05", "year": 2014,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Dongfeng Cummins 6BT"), ("ASM-TRA-ZF-WG200", "Transmisión Liuzhou ZF"), ("ASM-HYD-REXROTH-A10", "Banco Hidráulico")]},
    {"brand": "Sinomach", "model": "722H", "category": "Motoniveladoras", "internal_code": "MOT-06", "year": 2020,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6CTAA 8.3"), ("ASM-TRA-ZF-WG200", "Transmisión ZF WG200"), ("ASM-HYD-REXROTH-A10", "Bomba de Pistones Rexroth")]},

    # --- Palas Cargadoras ---
    {"brand": "Astarsa", "model": "AA936FS", "category": "Palas Cargadoras", "internal_code": "PAL-01", "year": 2012,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Deutz/Cummins 6 Cil."), ("ASM-TRA-ZF-WG200", "Transmisión ZF WG200"), ("ASM-HYD-REXROTH-A10", "Válvula de Balde y Levante")]},
    {"brand": "Lonking", "model": "CDM833", "category": "Palas Cargadoras", "internal_code": "PAL-02", "year": 2018,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Weichai / Cummins"), ("ASM-TRA-ZF-WG200", "Transmisión Lonking/ZF"), ("ASM-HYD-REXROTH-A10", "Bomba Hidráulica de Carga")]},
    {"brand": "Lonking", "model": "CDM835", "category": "Palas Cargadoras", "internal_code": "PAL-03", "year": 2020,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 6BT 5.9"), ("ASM-TRA-ZF-WG200", "Caja Powershift ZF"), ("ASM-HYD-REXROTH-A10", "Cilindros de Elevación y Válvula")]},

    # --- Retroexcavadoras ---
    {"brand": "Bull", "model": "HD96", "category": "Retroexcavadoras", "internal_code": "RET-01", "year": 2019,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Kirloskar / Perkins 4 Cil."), ("ASM-TRA-ZF-WG200", "Transmisión Carraro/ZF Synchro"), ("ASM-HYD-REXROTH-A10", "Bomba Doble a Engranajes")]},
    {"brand": "Changlin", "model": "630A", "category": "Retroexcavadoras", "internal_code": "RET-02", "year": 2015,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Perkins 1104C"), ("ASM-HYD-REXROTH-A10", "Distribuidor Hidráulico Principal")]},
    {"brand": "Liangong", "model": "M-42", "category": "Retroexcavadoras", "internal_code": "RET-03", "year": 2013,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Yuchai/Cummins 4 Cil."), ("ASM-HYD-REXROTH-A10", "Bomba Hidráulica Principal")]},
    {"brand": "XCMG", "model": "XT870BR", "category": "Retroexcavadoras", "internal_code": "RET-04", "year": 2021,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins QSF 3.8 / 4BT"), ("ASM-TRA-ZF-WG200", "Transmisión Carraro Power Shuttle"), ("ASM-HYD-REXROTH-A10", "Bomba de Caudal Variable")]},

    # --- Terminadoras de Asfalto ---
    {"brand": "XCMG", "model": "RP.451 L", "category": "Terminadoras de Asfalto", "internal_code": "TER-01", "year": 2019,
     "assemblies": [("ASM-ENG-CUMMINS-6CT", "Motor Cummins 4BTA 3.9"), ("ASM-HYD-REXROTH-A10", "Sistema Hidráulico de Regla y Tracción")]},

    # --- Tractores ---
    {"brand": "Dongfeng", "model": "DF650", "category": "Tractores", "internal_code": "TRC-01", "year": 2016,
     "assemblies": [("ASM-ENG-KUBOTA-V3300", "Motor Diésel 4 Cil. 65HP"), ("ASM-DIF-DANA-SPICER", "Toma de Fuerza y Diferencial")]},
    {"brand": "Massey Ferguson", "model": "1175", "category": "Tractores", "internal_code": "TRC-02", "year": 1995,
     "assemblies": [("ASM-ENG-MWM-410", "Motor Perkins 4.236 / MWM"), ("ASM-DIF-DANA-SPICER", "Caja y Eje Trasero MF")]},
]

# ==============================================================================
# 3. EJECUCIÓN DEL SEEDER ASÍNCRONO
# ==============================================================================

async def seed_database():
    async with engine.begin() as conn:
        # Recrea tablas para garantizar un estado limpio
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        async with session.begin():
            # 1. Insertar Ensambles y Partes
            for asm_data in MASTER_ASSEMBLIES:
                parts_data = asm_data.pop("parts")
                assembly = Assembly(**asm_data)
                session.add(assembly)
                await session.flush()

                for part_data in parts_data:
                    part_id = f"{assembly.id}-P{part_data['pos_number']:02d}"
                    part = Part(id=part_id, assembly_id=assembly.id, **part_data)
                    session.add(part)

            # 2. Insertar Vehículos y Mapeos Many-to-Many
            for v_idx, v_data in enumerate(VEHICLES_SEED, start=1):
                assemblies_mapping = v_data.pop("assemblies")
                vehicle_id = f"VEH-{v_idx:03d}"
                vehicle = Vehicle(id=vehicle_id, **v_data)
                session.add(vehicle)
                await session.flush()

                for asm_id, position in assemblies_mapping:
                    assoc = VehicleAssemblyAssociation(
                        vehicle_id=vehicle.id,
                        assembly_id=asm_id,
                        installed_position=position
                    )
                    session.add(assoc)

        print(f"Base de datos poblada exitosamente: {len(MASTER_ASSEMBLIES)} ensambles maestros y {len(VEHICLES_SEED)} vehículos registrados.")

if __name__ == "__main__":
    asyncio.run(seed_database())