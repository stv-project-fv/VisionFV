import json
import logging
from pathlib import Path
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def inject_part_metadata(
    gltf_data: dict[str, Any],
    metadata_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """
    Injects explode vectors, OEM codes, torque specifications, and eBOM attributes
    into glTF nodes' `extras` / `userData` dictionary.

    :param gltf_data: Parsed glTF JSON dictionary.
    :param metadata_map: Dictionary mapping node names/IDs to metadata dict.
    :return: Updated glTF JSON dictionary.
    """
    nodes = gltf_data.get("nodes", [])
    updated_count = 0

    for node in nodes:
        node_name = node.get("name")
        if node_name and node_name in metadata_map:
            meta = metadata_map[node_name]
            if "extras" not in node:
                node["extras"] = {}

            node["extras"].update({
                "partId": meta.get("id", node_name),
                "oemCode": meta.get("oem_code", ""),
                "name": meta.get("name", node_name),
                "explodeVector": meta.get("explode_vector", [0.0, 0.0, 0.0]),
                "torqueSpec": meta.get("torque_spec"),
                "manualPage": meta.get("manual_page"),
            })
            updated_count += 1
            logger.info("Injected metadata into node '%s'", node_name)

    logger.info("Finished metadata injection. Updated %d nodes.", updated_count)
    return gltf_data


def process_gltf_file(
    input_path: str | Path,
    output_path: str | Path,
    metadata_map: dict[str, dict[str, Any]],
) -> None:
    """Reads glTF file, injects metadata, and writes output glTF."""
    input_file = Path(input_path)
    output_file = Path(output_path)

    if not input_file.exists():
        raise FileNotFoundError(f"Input glTF file '{input_file}' not found.")

    with open(input_file, encoding="utf-8") as f:
        gltf_json = json.load(f)

    modified_json = inject_part_metadata(gltf_json, metadata_map)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(modified_json, f, indent=2)

    logger.info("Saved modified glTF to '%s'", output_file)
