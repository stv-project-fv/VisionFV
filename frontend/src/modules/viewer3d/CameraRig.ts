import * as THREE from 'three';
import {
  computeBoundingBoxInfo,
  computeCameraFitDistance,
  computeCameraPositionFromSpherical,
} from './cameraMath';

const DAMPING_FACTOR = 0.08;
const MIN_DISTANCE = 0.5;
const MAX_DISTANCE = 60;

// ─── Minimal orbital controls (no dependency on three/examples) ──────────────

interface OrbitalState {
  spherical: THREE.Spherical;
  target: THREE.Vector3;
  isDragging: boolean;
  lastPointer: { x: number; y: number };
  isPanning: boolean;
  lastPanPointer: { x: number; y: number };
  wheelDeltaAccum: number;
}

export interface CameraRigConfig {
  enableDamping?: boolean;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
}

export class CameraRig {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private config: Required<CameraRigConfig>;

  private state: OrbitalState;

  // Smooth animation targets
  private targetSpherical: THREE.Spherical;
  private targetLookAt: THREE.Vector3;

  // GSAP-style focus animation
  private focusAnimation: {
    active: boolean;
    startSph: THREE.Spherical;
    endSph: THREE.Spherical;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    t: number;
    duration: number;
  } | null = null;

  // Event handler refs for cleanup
  private _onPointerDown: (e: PointerEvent) => void;
  private _onPointerMove: (e: PointerEvent) => void;
  private _onPointerUp: (e: PointerEvent) => void;
  private _onWheel: (e: WheelEvent) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    config: CameraRigConfig = {}
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.config = {
      enableDamping: config.enableDamping ?? true,
      minDistance: config.minDistance ?? MIN_DISTANCE,
      maxDistance: config.maxDistance ?? MAX_DISTANCE,
      minPolarAngle: config.minPolarAngle ?? 0.1,
      maxPolarAngle: config.maxPolarAngle ?? Math.PI * 0.88,
    };

    // Compute initial spherical from camera position
    const initialTarget = new THREE.Vector3(0, 0, 0);
    const offset = camera.position.clone().sub(initialTarget);
    const sph = new THREE.Spherical().setFromVector3(offset);

    this.state = {
      spherical: sph.clone(),
      target: initialTarget.clone(),
      isDragging: false,
      lastPointer: { x: 0, y: 0 },
      isPanning: false,
      lastPanPointer: { x: 0, y: 0 },
      wheelDeltaAccum: 0,
    };

    this.targetSpherical = sph.clone();
    this.targetLookAt = initialTarget.clone();

    // Bind event handlers
    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
    this._onWheel = this.onWheel.bind(this);

    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerup', this._onPointerUp);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: true });
  }

  // ── Input handlers ───────────────────────────────────────────────────────────

  private onPointerDown(e: PointerEvent): void {
    if (e.button === 0) {
      this.state.isDragging = true;
      this.state.lastPointer = { x: e.clientX, y: e.clientY };
    }
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      this.state.isPanning = true;
      this.state.lastPanPointer = { x: e.clientX, y: e.clientY };
    }
    this.domElement.setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.state.isDragging && !this.state.isPanning) {
      const dx = e.clientX - this.state.lastPointer.x;
      const dy = e.clientY - this.state.lastPointer.y;
      this.state.lastPointer = { x: e.clientX, y: e.clientY };

      this.targetSpherical.theta -= dx * 0.006;
      this.targetSpherical.phi -= dy * 0.006;
      this.targetSpherical.phi = THREE.MathUtils.clamp(
        this.targetSpherical.phi,
        this.config.minPolarAngle,
        this.config.maxPolarAngle
      );
    }

    if (this.state.isPanning) {
      const dx = e.clientX - this.state.lastPanPointer.x;
      const dy = e.clientY - this.state.lastPanPointer.y;
      this.state.lastPanPointer = { x: e.clientX, y: e.clientY };

      const panScale = (this.state.spherical.radius * 0.001) * this.camera.fov;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      up.copy(this.camera.up).normalize();
      right.cross(up).normalize();

      this.targetLookAt.addScaledVector(right, -dx * panScale);
      this.targetLookAt.addScaledVector(up, dy * panScale);
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.state.isDragging = false;
    this.state.isPanning = false;
    this.domElement.releasePointerCapture(e.pointerId);
  }

  private onWheel(e: WheelEvent): void {
    const delta = e.deltaY * 0.002;
    this.targetSpherical.radius = THREE.MathUtils.clamp(
      this.targetSpherical.radius * (1 + delta),
      this.config.minDistance,
      this.config.maxDistance
    );
  }

  // ── Focus animation ──────────────────────────────────────────────────────────

  public focusOnBounds(box: THREE.Box3, durationMs: number = 800): void {
    const { center, maxDimension } = computeBoundingBoxInfo(box);
    const distance = computeCameraFitDistance(maxDimension, this.camera.fov, 1.55);

    const startSph = this.targetSpherical.clone();
    const endSph = new THREE.Spherical(
      distance,
      this.targetSpherical.phi,
      this.targetSpherical.theta
    );

    this.focusAnimation = {
      active: true,
      startSph,
      endSph,
      startTarget: this.targetLookAt.clone(),
      endTarget: center.clone(),
      t: 0,
      duration: Math.max(durationMs, 100),
    };
  }

  // ── Update (call each frame from render loop) ─────────────────────────────────

  public update(deltaMs: number): void {
    if (this.focusAnimation?.active) {
      const anim = this.focusAnimation;
      anim.t += deltaMs;
      const rawT = Math.min(anim.t / anim.duration, 1);
      // Ease out cubic
      const t = 1 - Math.pow(1 - rawT, 3);

      this.targetSpherical.radius = THREE.MathUtils.lerp(
        anim.startSph.radius,
        anim.endSph.radius,
        t
      );
      this.targetSpherical.phi = THREE.MathUtils.lerp(anim.startSph.phi, anim.endSph.phi, t);
      this.targetSpherical.theta = THREE.MathUtils.lerp(
        anim.startSph.theta,
        anim.endSph.theta,
        t
      );
      this.targetLookAt.lerpVectors(anim.startTarget, anim.endTarget, t);

      if (rawT >= 1) this.focusAnimation = null;
    }

    if (this.config.enableDamping) {
      this.state.spherical.phi = THREE.MathUtils.lerp(
        this.state.spherical.phi,
        this.targetSpherical.phi,
        DAMPING_FACTOR
      );
      this.state.spherical.theta = THREE.MathUtils.lerp(
        this.state.spherical.theta,
        this.targetSpherical.theta,
        DAMPING_FACTOR
      );
      this.state.spherical.radius = THREE.MathUtils.lerp(
        this.state.spherical.radius,
        this.targetSpherical.radius,
        DAMPING_FACTOR
      );
      this.state.target.lerp(this.targetLookAt, DAMPING_FACTOR);
    } else {
      this.state.spherical.copy(this.targetSpherical);
      this.state.target.copy(this.targetLookAt);
    }

    this.camera.position.copy(
      computeCameraPositionFromSpherical(this.state.target, this.state.spherical)
    );
    this.camera.lookAt(this.state.target);
  }

  // ── Dispose ──────────────────────────────────────────────────────────────────

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerup', this._onPointerUp);
    this.domElement.removeEventListener('wheel', this._onWheel);
  }
}
