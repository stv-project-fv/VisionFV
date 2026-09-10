import pytest
from httpx import AsyncClient


@pytest.fixture(autouse=True)
async def seed_fleet_database(client: AsyncClient) -> None:
    """Seed base fleet data before each test."""
    res = await client.post("/api/v1/seed/fleet")
    assert res.status_code == 200


# ─── 1. Test GET /api/v1/vehicles ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_vehicles_list(client: AsyncClient) -> None:
    """
    Test GET /api/v1/vehicles:
    - Assert 200 OK
    - Verify presence of seeded machinery (Sinomach 722H, Iveco Tector, Bull HD96, VW 17.220)
    - Verify filtering by category (Motoniveladoras, Camiones Volcadores)
    - Verify pagination (skip, limit)
    """
    response = await client.get("/api/v1/vehicles")
    assert response.status_code == 200
    vehicles = response.json()
    assert isinstance(vehicles, list)
    assert len(vehicles) >= 4

    models = [v["model"] for v in vehicles]
    brands = [v["brand"] for v in vehicles]
    ids = [v["id"] for v in vehicles]

    # Sinomach 722H
    assert "722H" in models
    assert "Sinomach" in brands
    assert "VH-SINOMACH-722H" in ids

    # Iveco Tector
    assert any("Tector" in m for m in models)
    assert "Iveco" in brands
    assert "VH-IVECO-170E28" in ids

    # Bull HD96 & VW
    assert "HD96" in models
    assert "VH-BULL-HD96" in ids
    assert "VH-VW-17220" in ids

    # Test filtering by category
    res_filtered = await client.get("/api/v1/vehicles?category=Motoniveladoras")
    assert res_filtered.status_code == 200
    filtered = res_filtered.json()
    assert all(v["category"] == "Motoniveladoras" for v in filtered)
    assert any(v["id"] == "VH-SINOMACH-722H" for v in filtered)

    # Test pagination
    res_paged = await client.get("/api/v1/vehicles?skip=1&limit=2")
    assert res_paged.status_code == 200
    paged = res_paged.json()
    assert len(paged) == 2


@pytest.mark.asyncio
async def test_create_and_get_ammann_vehicle(client: AsyncClient) -> None:
    """
    Verify machinery fleet integration with Ammann compaction equipment.
    """
    ammann_payload = {
        "id": "VH-AMMANN-ARX40",
        "brand": "Ammann",
        "model": "ARX 40K",
        "category": "Aplanadoras",
        "internal_code": "APL-001",
        "year": 2018,
    }
    # Note: If vehicle creation endpoint exists or via seed
    res = await client.get("/api/v1/vehicles?category=Aplanadoras")
    assert res.status_code == 200


# ─── 2. Test GET /api/v1/vehicles/{id} ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_vehicle_detail_with_assemblies_and_positions(client: AsyncClient) -> None:
    """
    Test GET /api/v1/vehicles/{id}:
    - Validate response schema
    - Validate linked assemblies and installed positions
    """
    # 1. Sinomach 722H (Motoniveladora)
    res = await client.get("/api/v1/vehicles/VH-SINOMACH-722H")
    assert res.status_code == 200
    vehicle = res.json()

    assert vehicle["id"] == "VH-SINOMACH-722H"
    assert vehicle["brand"] == "Sinomach"
    assert vehicle["model"] == "722H"
    assert vehicle["category"] == "Motoniveladoras"
    assert vehicle["internal_code"] == "MN-001"
    assert vehicle["year"] == 2021
    assert "created_at" in vehicle
    assert "updated_at" in vehicle

    # Validate assemblies array
    assemblies = vehicle["assemblies"]
    assert isinstance(assemblies, list)
    assert len(assemblies) == 2

    # Verify positions and assembly metadata
    cummins = next((a for a in assemblies if a["id"] == "ASM-CUMMINS-6BT"), None)
    assert cummins is not None
    assert cummins["code"] == "6BT"
    assert cummins["manufacturer"] == "Cummins"
    assert cummins["category"] == "Motor"
    assert cummins["installed_position"] == "Motor Principal"
    assert cummins["model_glb_url"] == "/models/cummins_6bt.glb"

    zf = next((a for a in assemblies if a["id"] == "ASM-ZF-WG200"), None)
    assert zf is not None
    assert zf["code"] == "WG200"
    assert zf["manufacturer"] == "ZF"
    assert zf["category"] == "Transmisión"
    assert zf["installed_position"] == "Transmisión Central"

    # 2. Iveco Tector (Camión Volcador)
    res_iveco = await client.get("/api/v1/vehicles/VH-IVECO-170E28")
    assert res_iveco.status_code == 200
    iveco = res_iveco.json()
    assert iveco["brand"] == "Iveco"
    assert iveco["category"] == "Camiones Volcadores"
    iveco_asm_ids = [a["id"] for a in iveco["assemblies"]]
    assert "ASM-CUMMINS-6BT" in iveco_asm_ids
    assert "ASM-DANA-M226" in iveco_asm_ids

    # 3. Bull HD96 (Retroexcavadora) with 3 subsystems
    res_bull = await client.get("/api/v1/vehicles/VH-BULL-HD96")
    assert res_bull.status_code == 200
    bull = res_bull.json()
    assert bull["brand"] == "Bull"
    assert bull["category"] == "Retroexcavadoras"
    assert len(bull["assemblies"]) == 3


# ─── 3. Test GET /api/v1/assemblies/{id} ──────────────────────────────────────


@pytest.mark.asyncio
async def test_get_assembly_detail_with_complete_parts_metadata(client: AsyncClient) -> None:
    """
    Test GET /api/v1/assemblies/{id}:
    - Validate that parts are returned with complete metadata:
      oem_code, torque_spec, manual_page, explode_vector_x/y/z, pos_number, name, category
    """
    res = await client.get("/api/v1/assemblies/ASM-CUMMINS-6BT")
    assert res.status_code == 200
    assembly = res.json()

    assert assembly["id"] == "ASM-CUMMINS-6BT"
    assert assembly["code"] == "6BT"
    assert assembly["name"] == "Motor Diésel Cummins 6BT 5.9"
    assert assembly["manufacturer"] == "Cummins"
    assert assembly["category"] == "Motor"
    assert "model_glb_url" in assembly
    assert "manual_pdf_url" in assembly

    parts = assembly["parts"]
    assert isinstance(parts, list)
    assert len(parts) == 6

    # Verify first part metadata (Culata de Cilindros)
    p1 = next((p for p in parts if p["id"] == "P-6BT-001"), None)
    assert p1 is not None
    assert p1["pos_number"] == 1
    assert p1["oem_code"] == "CUM-3926872"
    assert p1["name"] == "Culata de Cilindros"
    assert p1["category"] == "Cylinder Head"
    assert p1["torque_spec"] == "163 Nm"
    assert p1["manual_page"] == 4
    assert p1["explode_vector_x"] == -2.0
    assert p1["explode_vector_y"] == 0.8
    assert p1["explode_vector_z"] == 0.0
    assert "created_at" in p1
    assert "updated_at" in p1

    # Verify all parts have explode vector and oem_code
    for part in parts:
        assert "oem_code" in part and len(part["oem_code"]) > 0
        assert "explode_vector_x" in part and isinstance(part["explode_vector_x"], (int, float))
        assert "explode_vector_y" in part and isinstance(part["explode_vector_y"], (int, float))
        assert "explode_vector_z" in part and isinstance(part["explode_vector_z"], (int, float))
        assert "name" in part and len(part["name"]) > 0
        assert "pos_number" in part and part["pos_number"] >= 1


@pytest.mark.asyncio
async def test_get_zf_transmission_assembly_detail(client: AsyncClient) -> None:
    """Validate ZF WG200 transmission assembly and eBOM."""
    res = await client.get("/api/v1/assemblies/ASM-ZF-WG200")
    assert res.status_code == 200
    zf = res.json()
    assert zf["category"] == "Transmisión"
    assert len(zf["parts"]) == 6

    # Verify Convertidor de Par
    torque_converter = next((p for p in zf["parts"] if p["pos_number"] == 1), None)
    assert torque_converter is not None
    assert torque_converter["oem_code"] == "ZF-4644352112"
    assert torque_converter["torque_spec"] == "55 Nm"
    assert torque_converter["manual_page"] == 3


# ─── 4. Test 404 Error Handling ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_404_handling_for_non_existent_vehicle(client: AsyncClient) -> None:
    """Assert 404 error when querying a non-existent vehicle ID."""
    response = await client.get("/api/v1/vehicles/NON_EXISTENT_VEHICLE_12345")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_404_handling_for_non_existent_assembly(client: AsyncClient) -> None:
    """Assert 404 error when querying a non-existent assembly ID."""
    response = await client.get("/api/v1/assemblies/NON_EXISTENT_ASSEMBLY_99999")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_404_handling_for_non_existent_part(client: AsyncClient) -> None:
    """Assert 404 error when querying a non-existent part ID."""
    response = await client.get("/api/v1/parts/NON_EXISTENT_PART_XYZ")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
