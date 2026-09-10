import * as THREE from 'three';
import type { PartEntity } from '@/types';
import { getPartExplodeVector } from '@/types';

// ─── Procedural geometry helpers ────────────────────────────────────────────

function makeFallbackGeometry(index: number): THREE.BufferGeometry {
  const size = 0.55 + (index % 3) * 0.12;
  switch (index % 4) {
    case 0: return new THREE.BoxGeometry(size, size * 0.7, size);
    case 1: return new THREE.CylinderGeometry(size * 0.4, size * 0.45, size * 1.1, 24);
    case 2: return new THREE.TorusGeometry(size * 0.45, size * 0.15, 16, 48);
    default: return new THREE.SphereGeometry(size * 0.4, 24, 16);
  }
}

const PALETTE: number[] = [
  0x38bdf8, // sky-400
  0x818cf8, // indigo-400
  0x34d399, // emerald-400
  0xfbbf24, // amber-400
  0xf472b6, // pink-400
  0xa78bfa, // violet-400
];

// ─── Material catalogue ──────────────────────────────────────────────────────

export function makeHighlightMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.7,
  });
}

export function makeGhostMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x475569,
    emissive: 0x000000,
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: 0.25,
  });
}

// ─── SceneManager ────────────────────────────────────────────────────────────

export interface SceneManagerConfig {
  onSelectPart?: (partId: string | null) => void;
  onHoverPart?: (partId: string | null) => void;
}

export interface SceneObjects {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  partsRoot: THREE.Group;
}

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly partsRoot: THREE.Group;

  private container: HTMLElement;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private originalMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map();

  private _highlightMaterial: THREE.MeshStandardMaterial;
  private _ghostMaterial: THREE.MeshStandardMaterial;

  constructor(container: HTMLElement, _config: SceneManagerConfig = {}) {
    this.container = container;

    // ── Renderer ────────────────────────────────────────────────────────────
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // ── Scene ───────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);
    this.scene.fog = new THREE.Fog(0x0d1117, 18, 40);

    // ── Camera ──────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 200);
    this.camera.position.set(5, 3.5, 6);
    this.camera.lookAt(0, 0, 0);

    // ── Lighting ─────────────────────────────────────────────────────────────
    this.setupLighting();

    // ── Scene helpers ────────────────────────────────────────────────────────
    this.addGridAndHelpers();

    // ── Parts group ──────────────────────────────────────────────────────────
    this.partsRoot = new THREE.Group();
    this.partsRoot.name = 'partsRoot';
    this.scene.add(this.partsRoot);

    // ── Shared materials ─────────────────────────────────────────────────────
    this._highlightMaterial = makeHighlightMaterial();
    this._ghostMaterial = makeGhostMaterial();

    // ── Resize observer ──────────────────────────────────────────────────────
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);

    // ── Render loop ──────────────────────────────────────────────────────────
    this.startRenderLoop();
  }

  // ── Lighting ───────────────────────────────────────────────────────────────

  private setupLighting(): void {
    // Ambient — soft fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    // Key light — simulated daylight
    const key = new THREE.DirectionalLight(0xfff6e8, 2.2);
    key.position.set(8, 14, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.001;
    this.scene.add(key);

    // Fill light — cool backlight
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.6);
    fill.position.set(-10, -4, -10);
    this.scene.add(fill);

    // Rim light — warm technical edge
    const rim = new THREE.DirectionalLight(0xfbbf24, 0.35);
    rim.position.set(0, -8, 4);
    this.scene.add(rim);
  }

  private addGridAndHelpers(): void {
    const grid = new THREE.GridHelper(20, 40, 0x1e293b, 0x0f172a);
    grid.position.y = -1.05;
    this.scene.add(grid);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Procedural part loader ─────────────────────────────────────────────────

  public loadParts(parts: readonly PartEntity[]): void {
    this.clearParts();

    parts.forEach((part, i) => {
      const geo = makeFallbackGeometry(i);
      const mat = new THREE.MeshStandardMaterial({
        color: PALETTE[i % PALETTE.length],
        metalness: 0.55,
        roughness: 0.35,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = part.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Arrange in 3-column grid
      const cols = 3;
      const col = i % cols;
      const row = Math.floor(i / cols);
      mesh.position.set((col - 1) * 1.4, 0, (row - 0.5) * 1.4);

      this.originalMaterials.set(mesh.uuid, mat);
      this.partsRoot.add(mesh);
    });
  }

  // ── Material modes ─────────────────────────────────────────────────────────

  public applySelectionMode(selectedId: string | null): void {
    this.partsRoot.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const isSelected = obj.name === selectedId;
      const original = this.originalMaterials.get(obj.uuid);

      if (selectedId === null) {
        // Restore all
        if (original) obj.material = original;
      } else if (isSelected) {
        obj.material = this._highlightMaterial;
      } else {
        obj.material = this._ghostMaterial;
      }
    });
  }

  public applyHoverHighlight(hoveredId: string | null, selectedId: string | null): void {
    this.partsRoot.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name === selectedId) return; // Don't override selection

      const original = this.originalMaterials.get(obj.uuid);
      if (obj.name === hoveredId) {
        const hoverMat = this._highlightMaterial.clone();
        hoverMat.emissiveIntensity = 0.25;
        obj.material = hoverMat;
      } else if (selectedId !== null) {
        obj.material = this._ghostMaterial;
      } else if (original) {
        obj.material = original;
      }
    });
  }

  public getMeshByPartId(partId: string): THREE.Mesh | null {
    let found: THREE.Mesh | null = null;
    this.partsRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name === partId) {
        found = obj;
      }
    });
    return found;
  }

  public getBoundingBox(): THREE.Box3 {
    const box = new THREE.Box3();
    this.partsRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        box.expandByObject(obj);
      }
    });
    return box;
  }

  // ── Render loop ─────────────────────────────────────────────────────────────

  private startRenderLoop(): void {
    const tick = (): void => {
      this.animationFrameId = requestAnimationFrame(tick);
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  private clearParts(): void {
    this.partsRoot.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.partsRoot.clear();
    this.originalMaterials.clear();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.clearParts();
    this._highlightMaterial.dispose();
    this._ghostMaterial.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });

    this.renderer.dispose();
    this.renderer.domElement.parentElement?.removeChild(this.renderer.domElement);
  }
}

// Re-export helper for external use
export { getPartExplodeVector };
