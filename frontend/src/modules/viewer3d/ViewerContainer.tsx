import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { CameraRig } from './CameraRig';
import { ExplodeController } from './ExplodeController';
import { InteractionRaycaster } from './InteractionRaycaster';
import { useAssemblyStore } from '@/store/useAssemblyStore';

// ─── Engine bundle type ────────────────────────────────────────────────────

interface Engine {
  scene: SceneManager;
  camera: CameraRig;
  explode: ExplodeController;
  raycaster: InteractionRaycaster;
  clock: THREE.Clock;
  animId: number;
}

// ─── ViewerContainer ───────────────────────────────────────────────────────

export const ViewerContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);

  // ── Zustand atomic selectors ──────────────────────────────────────────────
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const selectedPartId = useAssemblyStore((s) => s.selectedPartId);
  const explosionFactor = useAssemblyStore((s) => s.explosionFactor);
  const setSelectedPartId = useAssemblyStore((s) => s.setSelectedPartId);
  const setHoveredPartId = useAssemblyStore((s) => s.setHoveredPartId);

  // ── Mount: initialize engine ───────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Core scene
    const sceneMgr = new SceneManager(container);

    // 2. Camera rig (damped orbital controls)
    const cameraRig = new CameraRig(sceneMgr.camera, sceneMgr.renderer.domElement, {
      enableDamping: true,
      minDistance: 1,
      maxDistance: 50,
    });

    // 3. Explode controller
    const explodeCtrl = new ExplodeController();

    // 4. Interaction raycaster — callbacks fire into Zustand
    const raycaster = new InteractionRaycaster(
      sceneMgr.camera,
      sceneMgr.renderer.domElement,
      sceneMgr.partsRoot,
      {
        onSelect: (id) => setSelectedPartId(id),
        onHover: (id) => setHoveredPartId(id),
      }
    );

    // 5. Main render loop (owns delta time for camera damping)
    const clock = new THREE.Clock();
    let animId = 0;
    const tick = (): void => {
      animId = requestAnimationFrame(tick);
      const delta = clock.getDelta() * 1000; // ms
      cameraRig.update(delta);
      sceneMgr.renderer.render(sceneMgr.scene, sceneMgr.camera);
    };
    tick();

    engineRef.current = { scene: sceneMgr, camera: cameraRig, explode: explodeCtrl, raycaster, clock, animId };

    return () => {
      cancelAnimationFrame(animId);
      raycaster.dispose();
      explodeCtrl.dispose();
      cameraRig.dispose();
      sceneMgr.dispose();
      engineRef.current = null;
    };
  }, [setSelectedPartId, setHoveredPartId]);

  // ── Sync parts when assembly changes ──────────────────────────────────────
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng || !currentAssembly || currentAssembly.parts.length === 0) return;

    // Load procedural geometry
    eng.scene.loadParts(currentAssembly.parts);

    // Snapshot original materials for interaction highlighting
    eng.raycaster.snapshotMaterials();

    // Register parts for explode offsets
    eng.explode.registerParts(currentAssembly.parts, eng.scene.partsRoot);

    // Fly camera to frame all parts
    const box = eng.scene.getBoundingBox();
    if (!box.isEmpty()) {
      eng.camera.focusOnBounds(box, 900);
    }
  }, [currentAssembly]);

  // ── Sync selection → engine ────────────────────────────────────────────────
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.raycaster.syncSelection(selectedPartId);

    // Focus camera on selected part
    if (selectedPartId) {
      const mesh = eng.scene.getMeshByPartId(selectedPartId);
      if (mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        eng.camera.focusOnBounds(box, 600);
      }
    }
  }, [selectedPartId]);

  // ── Sync explosion factor ─────────────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.explode.setFactor(explosionFactor);
  }, [explosionFactor]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[450px] overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner"
      style={{ cursor: 'grab' }}
    >
      {/* HUD badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1.5">
        <div className="px-3 py-1.5 rounded-lg bg-zinc-900/80 backdrop-blur border border-zinc-700/60 text-xs font-medium text-zinc-300">
          Vista 3D &bull; WebGL Interactivo
        </div>
        <div className="px-3 py-1 rounded-md bg-blue-600/10 border border-blue-500/20 text-[11px] font-mono text-blue-400">
          Rotar (clic izq.) &bull; Zoom (rueda) &bull; Desplazar (Ctrl+clic)
        </div>
      </div>
    </div>
  );
};
