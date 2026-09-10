"""
Headless Blender 3D Batch Processor — auto_explode_gltf.py
===========================================================
Imports raw geometry, computes normalized radial/axial explode vectors
for each sub-mesh, writes Blender custom properties, and exports .glb
with Draco compression and extras.

Usage (run via Blender headless):
    blender --background --python scripts/auto_explode_gltf.py -- <input_file> <output_file.glb>

Supported input formats: .obj  .fbx  (STEP requires CAD importer add-on)

Algorithm:
    1. Import all sub-meshes.
    2. Compute global assembly centroid C = mean of all per-mesh centroids.
    3. For each mesh i:
          v_i = (C_part_i - C_assembly) / ||C_part_i - C_assembly||
       If distance is 0 (part at centroid), v_i = (0, 0, 1) fallback.
    4. Store v_i as custom property "explode_vector" = [x, y, z].
    5. Export to .glb with DRACO compression + export_extras=True.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

# ─── Guard: must be run inside Blender Python ─────────────────────────────────

try:
    import bpy  # type: ignore[import]
except ImportError:
    print(
        "ERROR: This script must be run inside Blender.\n"
        "  blender --background --python auto_explode_gltf.py -- <input> <output>"
    )
    sys.exit(1)

# ─── Argument parsing (Blender passes user args after '--') ───────────────────


def get_user_args() -> tuple[Path, Path]:
    """Extract <input_file> <output_file> from sys.argv after '--'."""
    argv = sys.argv
    try:
        sep_idx = argv.index("--")
    except ValueError:
        print("Usage: blender --background --python auto_explode_gltf.py -- <input> <output.glb>")
        sys.exit(1)

    user_args = argv[sep_idx + 1 :]
    if len(user_args) < 2:
        print("ERROR: Expected two arguments after '--': <input_file> <output_file.glb>")
        sys.exit(1)

    return Path(user_args[0]), Path(user_args[1])


# ─── Blender scene helpers ────────────────────────────────────────────────────


def clear_scene() -> None:
    """Remove all objects and data blocks from the default scene."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_collection in [
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.textures,
        bpy.data.images,
    ]:
        for block in block_collection:
            block_collection.remove(block)


def import_geometry(input_path: Path) -> None:
    """Dispatch to the appropriate importer based on file extension."""
    ext = input_path.suffix.lower()
    print(f"[auto_explode] Importing {ext.upper()}: {input_path}")

    if ext == ".obj":
        bpy.ops.wm.obj_import(filepath=str(input_path))
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=str(input_path))
    elif ext in {".step", ".stp"}:
        # Requires the CAD importer add-on (OpenCASCADE-based)
        bpy.ops.import_scene.step(filepath=str(input_path))
    else:
        print(f"ERROR: Unsupported format '{ext}'. Supported: .obj .fbx .step")
        sys.exit(1)


def get_mesh_objects() -> list:
    """Return all Mesh-type objects in the scene."""
    return [obj for obj in bpy.data.objects if obj.type == "MESH"]


# ─── Vector math ──────────────────────────────────────────────────────────────

Vec3 = tuple[float, float, float]


def centroid_of_object(obj) -> Vec3:  # type: ignore[return]
    """World-space bounding box center of a Blender mesh object."""
    corners = [obj.matrix_world @ v for v in obj.bound_box]
    cx = sum(v.x for v in corners) / 8.0
    cy = sum(v.y for v in corners) / 8.0
    cz = sum(v.z for v in corners) / 8.0
    return (cx, cy, cz)


def vec_subtract(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vec_length(v: Vec3) -> float:
    return math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)


def vec_normalize(v: Vec3) -> Vec3:
    length = vec_length(v)
    if length < 1e-9:
        return (0.0, 0.0, 1.0)  # fallback: parts at centroid explode upward
    return (v[0] / length, v[1] / length, v[2] / length)


# ─── Main processing ──────────────────────────────────────────────────────────


def compute_and_assign_explode_vectors(meshes: list) -> dict:
    """
    Computes the normalized radial explode vector for each mesh.
    Returns a summary dict {object_name: [vx, vy, vz]}.

    Formula:
        C_assembly = (1/N) * Σ C_part_i
        v_i        = normalize(C_part_i - C_assembly)
    """
    # Step 1: compute each part centroid
    centroids: dict[str, Vec3] = {}
    for obj in meshes:
        centroids[obj.name] = centroid_of_object(obj)

    n = len(meshes)
    if n == 0:
        return {}

    # Step 2: assembly centroid
    asm_cx = sum(c[0] for c in centroids.values()) / n
    asm_cy = sum(c[1] for c in centroids.values()) / n
    asm_cz = sum(c[2] for c in centroids.values()) / n
    asm_centroid: Vec3 = (asm_cx, asm_cy, asm_cz)

    print(f"[auto_explode] Assembly centroid: ({asm_cx:.4f}, {asm_cy:.4f}, {asm_cz:.4f})")

    # Step 3: compute and assign explode vectors
    summary: dict[str, list[float]] = {}
    for obj in meshes:
        part_centroid = centroids[obj.name]
        direction = vec_subtract(part_centroid, asm_centroid)
        unit_vector = vec_normalize(direction)

        vx, vy, vz = unit_vector

        # Write as Blender custom properties (stored in GLB extras)
        obj["part_id"] = obj.name
        obj["explode_vector"] = json.dumps([round(vx, 6), round(vy, 6), round(vz, 6)])

        summary[obj.name] = [round(vx, 6), round(vy, 6), round(vz, 6)]
        print(f"  [part] {obj.name:40s} → explode_vector: [{vx:.4f}, {vy:.4f}, {vz:.4f}]")

    return summary


def export_glb(output_path: Path) -> None:
    """
    Exports the entire scene to .glb with:
    - Draco mesh compression
    - export_extras=True (preserves custom properties as glTF extras)
    - Apply transforms before export
    """
    print(f"[auto_explode] Exporting to: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    export_kwargs: dict = {
        "filepath": str(output_path),
        "export_format": "GLB",
        "export_extras": True,          # preserve custom properties
        "export_apply": True,           # apply all modifiers
        "export_draco_mesh_compression_enable": True,
        "export_draco_mesh_compression_level": 6,
        "export_materials": "EXPORT",
        "export_texcoords": True,
        "export_normals": True,
        "use_selection": False,
    }

    try:
        bpy.ops.export_scene.gltf(**export_kwargs)
        print("[auto_explode] Export complete.")
    except Exception as exc:
        # Draco may not be available in all Blender builds — retry without it
        print(f"[auto_explode] Draco export failed ({exc}). Retrying without compression...")
        export_kwargs["export_draco_mesh_compression_enable"] = False
        bpy.ops.export_scene.gltf(**export_kwargs)
        print("[auto_explode] Export complete (without Draco compression).")


# ─── Entry point ──────────────────────────────────────────────────────────────


def main() -> None:
    input_path, output_path = get_user_args()

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    print(f"[auto_explode] Starting pipeline: {input_path} → {output_path}")

    clear_scene()
    import_geometry(input_path)

    meshes = get_mesh_objects()
    if not meshes:
        print("ERROR: No mesh objects found after import.")
        sys.exit(1)

    print(f"[auto_explode] Found {len(meshes)} mesh object(s).")
    summary = compute_and_assign_explode_vectors(meshes)

    # Dump summary JSON for downstream tooling
    summary_path = output_path.with_suffix(".explode_vectors.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[auto_explode] Vector summary written to: {summary_path}")

    export_glb(output_path)
    print("[auto_explode] Pipeline finished successfully.")


main()
