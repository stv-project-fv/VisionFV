import * as THREE from 'three';
import { makeHighlightMaterial, makeGhostMaterial } from './SceneManager';

export interface InteractionCallbacks {
  onSelect: (partId: string | null) => void;
  onHover: (partId: string | null) => void;
}

interface MaterialRecord {
  uuid: string;
  original: THREE.Material | THREE.Material[];
}

export class InteractionRaycaster {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private partsRoot: THREE.Group;
  private callbacks: InteractionCallbacks;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  private selectedId: string | null = null;
  private hoveredId: string | null = null;

  private originalMaterials: Map<string, MaterialRecord> = new Map();

  // Shared named materials
  private highlightMat: THREE.MeshStandardMaterial;
  private ghostMat: THREE.MeshStandardMaterial;

  private _onPointerMove: (e: PointerEvent) => void;
  private _onPointerDown: (e: PointerEvent) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    partsRoot: THREE.Group,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.partsRoot = partsRoot;
    this.callbacks = callbacks;

    this.highlightMat = makeHighlightMaterial();
    this.ghostMat = makeGhostMaterial();

    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerDown = this.onPointerDown.bind(this);

    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerdown', this._onPointerDown);
  }

  // ── Part registry ──────────────────────────────────────────────────────────

  /**
   * Must be called after new parts are loaded into partsRoot so
   * original materials are snapshotted.
   */
  public snapshotMaterials(): void {
    this.originalMaterials.clear();
    this.partsRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        this.originalMaterials.set(obj.name, {
          uuid: obj.uuid,
          original: Array.isArray(obj.material)
            ? [...obj.material]
            : obj.material,
        });
      }
    });
  }

  // ── NDC conversion ─────────────────────────────────────────────────────────

  private toNDC(e: PointerEvent): void {
    // Always compute against bounding rect for correct multi-panel layouts
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedMeshName(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.partsRoot.children, true);
    const hit = hits.find((h) => h.object instanceof THREE.Mesh);
    return hit ? hit.object.name : null;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  private onPointerMove(e: PointerEvent): void {
    // Skip if dragging (camera controls should have priority)
    if (e.buttons !== 0) return;

    this.toNDC(e);
    const name = this.getIntersectedMeshName();

    if (name !== this.hoveredId) {
      this.hoveredId = name;
      this.callbacks.onHover(name);
      this.applyMaterials();
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;

    this.toNDC(e);
    const name = this.getIntersectedMeshName();

    if (name !== null && name !== this.selectedId) {
      this.selectedId = name;
      this.callbacks.onSelect(name);
    } else if (name === null && this.selectedId !== null) {
      this.selectedId = null;
      this.callbacks.onSelect(null);
    }

    this.applyMaterials();
  }

  // ── Material application ───────────────────────────────────────────────────

  /**
   * Visual modes:
   * - Nothing selected → all parts show their original material
   * - Part selected → selected part → highlight; rest → ghost (opacity 0.25, desaturated)
   * - Hover only (no selection) → hovered part → dim highlight; rest → original
   */
  private applyMaterials(): void {
    this.partsRoot.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const partId = obj.name;
      const record = this.originalMaterials.get(partId);
      if (!record) return;

      const isSelected = partId === this.selectedId;
      const isHovered = partId === this.hoveredId;

      if (this.selectedId !== null) {
        if (isSelected) {
          obj.material = this.highlightMat;
        } else if (isHovered) {
          // Ghost but slightly brighter on hover
          const hoverGhost = this.ghostMat.clone();
          hoverGhost.opacity = 0.35;
          obj.material = hoverGhost;
        } else {
          obj.material = this.ghostMat;
        }
      } else {
        // No selection — restore original; highlight on hover
        if (isHovered) {
          const hoverMat = this.highlightMat.clone();
          hoverMat.emissiveIntensity = 0.22;
          hoverMat.color.set(0x60a5fa);
          obj.material = hoverMat;
        } else {
          obj.material = record.original;
        }
      }
    });
  }

  // ── External sync (store → engine) ────────────────────────────────────────

  public syncSelection(selectedId: string | null): void {
    if (this.selectedId !== selectedId) {
      this.selectedId = selectedId;
      this.applyMaterials();
    }
  }

  // ── Dispose ────────────────────────────────────────────────────────────────

  public dispose(): void {
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.highlightMat.dispose();
    this.ghostMat.dispose();
    this.originalMaterials.clear();
  }
}
