import pytest
from httpx import AsyncClient


# ─── Existing tests ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "VISION3DPARTS Backend"}


@pytest.mark.asyncio
async def test_assemblies_and_ebom_lifecycle(client: AsyncClient) -> None:
    # 1. Create Assembly (with new required fields: code, manufacturer, category)
    assembly_payload = {
        "id": "DIFF-REDUCER-01",
        "code": "DIFF-01",
        "name": "Caja Reductora / Diferencial",
        "manufacturer": "Dana Spicer",
        "category": "Diferencial",
        "model_glb_url": "/models/diff.glb",
        "manual_pdf_url": "/manuals/diff.pdf",
    }
    res_asm = await client.post("/api/v1/assemblies", json=assembly_payload)
    assert res_asm.status_code == 201
    data_asm = res_asm.json()
    assert data_asm["id"] == "DIFF-REDUCER-01"
    assert data_asm["name"] == "Caja Reductora / Diferencial"
    assert data_asm["manufacturer"] == "Dana Spicer"
    assert data_asm["category"] == "Diferencial"

    # 2. Create Part (with new optional pos_number field)
    part_payload = {
        "id": "PART-CR-01",
        "assembly_id": "DIFF-REDUCER-01",
        "pos_number": 1,
        "oem_code": "DIF-8001-CR",
        "name": "Carcasa Principal de Transmisión",
        "category": "Housing / Estructura",
        "torque_spec": "48 Nm",
        "manual_page": 2,
        "explode_vector_x": -2.0,
        "explode_vector_y": 0.0,
        "explode_vector_z": 0.0,
    }
    res_part = await client.post("/api/v1/parts", json=part_payload)
    assert res_part.status_code == 201
    data_part = res_part.json()
    assert data_part["oem_code"] == "DIF-8001-CR"
    assert data_part["explode_vector_x"] == -2.0
    assert data_part["pos_number"] == 1

    # 3. Fetch assemblies list
    res_list = await client.get("/api/v1/assemblies")
    assert res_list.status_code == 200
    assemblies = res_list.json()
    assert len(assemblies) >= 1
    assert assemblies[0]["id"] == "DIFF-REDUCER-01"

    # 4. Fetch Assembly Detail (eBOM)
    res_detail = await client.get("/api/v1/assemblies/DIFF-REDUCER-01")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == "DIFF-REDUCER-01"
    assert len(detail["parts"]) == 1
    assert detail["parts"][0]["oem_code"] == "DIF-8001-CR"

    # 5. Filter assemblies by category
    res_cat = await client.get("/api/v1/assemblies?category=Diferencial")
    assert res_cat.status_code == 200
    cat_list = res_cat.json()
    assert any(a["id"] == "DIFF-REDUCER-01" for a in cat_list)


# ─── Fleet / Vehicle tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_fleet_seed_and_vehicles_lifecycle(client: AsyncClient) -> None:
    # 1. Seed fleet data
    res_seed = await client.post("/api/v1/seed/fleet")
    assert res_seed.status_code == 200
    seed_data = res_seed.json()
    assert seed_data["status"] == "ok"
    assert seed_data["total"]["vehicles"] == 4
    assert seed_data["total"]["assemblies"] == 4
    assert seed_data["total"]["parts"] == 24

    # 2. List all vehicles
    res_vehicles = await client.get("/api/v1/vehicles")
    assert res_vehicles.status_code == 200
    vehicles = res_vehicles.json()
    assert len(vehicles) >= 4
    vehicle_ids = [v["id"] for v in vehicles]
    assert "VH-SINOMACH-722H" in vehicle_ids
    assert "VH-IVECO-170E28" in vehicle_ids
    assert "VH-VW-17220" in vehicle_ids
    assert "VH-BULL-HD96" in vehicle_ids

    # 3. Filter vehicles by category
    res_mn = await client.get("/api/v1/vehicles?category=Motoniveladoras")
    assert res_mn.status_code == 200
    mn_list = res_mn.json()
    assert any(v["id"] == "VH-SINOMACH-722H" for v in mn_list)

    # 4. Vehicle detail — Sinomach 722H
    res_vh = await client.get("/api/v1/vehicles/VH-SINOMACH-722H")
    assert res_vh.status_code == 200
    vh = res_vh.json()
    assert vh["brand"] == "Sinomach"
    assert vh["model"] == "722H"
    assert vh["category"] == "Motoniveladoras"
    assert len(vh["assemblies"]) == 2

    asm_ids = [a["id"] for a in vh["assemblies"]]
    assert "ASM-CUMMINS-6BT" in asm_ids
    assert "ASM-ZF-WG200" in asm_ids

    # 5. installed_position is present
    cummins_link = next(a for a in vh["assemblies"] if a["id"] == "ASM-CUMMINS-6BT")
    assert cummins_link["installed_position"] == "Motor Principal"
    assert cummins_link["manufacturer"] == "Cummins"

    # 6. Bull HD96 has 3 subsystems
    res_bull = await client.get("/api/v1/vehicles/VH-BULL-HD96")
    assert res_bull.status_code == 200
    assert len(res_bull.json()["assemblies"]) == 3

    # 7. Assembly detail — Cummins 6BT (from seed)
    res_asm = await client.get("/api/v1/assemblies/ASM-CUMMINS-6BT")
    assert res_asm.status_code == 200
    asm = res_asm.json()
    assert asm["code"] == "6BT"
    assert asm["manufacturer"] == "Cummins"
    assert asm["category"] == "Motor"
    assert len(asm["parts"]) == 6

    # 8. 404 for unknown vehicle
    res_404 = await client.get("/api/v1/vehicles/NONEXISTENT")
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_batch_part_import(client: AsyncClient) -> None:
    # Create a base assembly first
    asm = {
        "id": "ASM-BATCH-TEST",
        "code": "BT-01",
        "name": "Test Assembly",
        "manufacturer": "TestCo",
        "category": "Motor",
    }
    res = await client.post("/api/v1/assemblies", json=asm)
    assert res.status_code == 201

    # Batch import parts
    batch = {
        "assembly_id": "ASM-BATCH-TEST",
        "parts": [
            {
                "id": "P-BT-001",
                "assembly_id": "ASM-BATCH-TEST",
                "pos_number": 1,
                "oem_code": "BT-1001",
                "name": "Test Part Alpha",
                "explode_vector_x": 1.0,
                "explode_vector_y": 0.0,
                "explode_vector_z": 0.0,
            },
            {
                "id": "P-BT-002",
                "assembly_id": "ASM-BATCH-TEST",
                "pos_number": 2,
                "oem_code": "BT-1002",
                "name": "Test Part Beta",
                "torque_spec": "22 Nm",
                "explode_vector_x": -1.0,
                "explode_vector_y": 0.0,
                "explode_vector_z": 0.0,
            },
        ],
        "overwrite_existing": False,
    }
    res_batch = await client.post("/api/v1/assemblies/batch/parts", json=batch)
    assert res_batch.status_code == 201
    assert len(res_batch.json()) == 2

    # Verify via detail endpoint
    res_detail = await client.get("/api/v1/assemblies/ASM-BATCH-TEST")
    assert res_detail.status_code == 200
    assert len(res_detail.json()["parts"]) == 2
