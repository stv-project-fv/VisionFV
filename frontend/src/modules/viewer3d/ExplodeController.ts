import * as THREE from 'three';
import { getPartExplodeVector, type PartEntity } from '@/types';

interface PartRecord {
  mesh: THREE.Object3D;
  initialPosition: THREE.Vector3;
  explodeVector: THREE.Vector3;
}

export class ExplodeController {
  private records: Map<string, PartRecord> = new Map();
  private currentFactor = 0;

  // ── Registration ──────────────────────────────────────────────────────────

  public registerPart(part: PartEntity, mesh: THREE.Object3D): void {
    const [ex, ey, ez] = getPartExplodeVector(part);
    this.records.set(part.id, {
      mesh,
      initialPosition: mesh.position.clone(),
      explodeVector: new THREE.Vector3(ex, ey, ez),
    });
  }

  public registerParts(parts: readonly PartEntity[], root: THREE.Group): void {
    this.clear();
    for (const part of parts) {
      const mesh = root.getObjectByName(part.id);
      if (mesh) {
        this.registerPart(part, mesh);
      }
    }
  }

  // ── Explode ────────────────────────────────────────────────────────────────

  /**
   * Moves each registered mesh along its explode vector by factor `t` ∈ [0,1].
   * t=0 → assembled position; t=1 → fully exploded position.
   */
  public setFactor(t: number): void {
    this.currentFactor = THREE.MathUtils.clamp(t, 0, 1);
    for (const { mesh, initialPosition, explodeVector } of this.records.values()) {
      mesh.position
        .copy(initialPosition)
        .addScaledVector(explodeVector, this.currentFactor);
    }
  }

  public getFactor(): number {
    return this.currentFactor;
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  public clear(): void {
    // Reset positions before clearing
    for (const { mesh, initialPosition } of this.records.values()) {
      mesh.position.copy(initialPosition);
    }
    this.records.clear();
    this.currentFactor = 0;
  }

  public dispose(): void {
    this.clear();
  }
}
