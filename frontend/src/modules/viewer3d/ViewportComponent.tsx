import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { CameraRig } from './CameraRig';
import { ExplodeController } from './ExplodeController';
import { InteractionRaycaster } from './InteractionRaycaster';
import { useAssemblyStore } from '@/store/useAssemblyStore';

// ─── Engine bundle ─────────────────────────────────────────────────────────────

interface Engine {
  scene: SceneManager;
  rig: CameraRig;
  explode: ExplodeController;
  raycaster: InteractionRaycaster;
  animId: number;
  clock: THREE.Clock;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ViewportProps {
  /**
   * Optional callback-ref populated by this component so the parent (WorkspaceCenter)
   * can trigger "fit view" without reaching into engine internals.
   */
  fitViewRef?: React.MutableRefObject<(() => void) | null>;
  /**
   * Optional callback-ref populated by this component so the parent (WorkspaceCenter)
   * can trigger "reset camera" without reaching into engine internals.
   */
  resetCameraRef?: React.MutableRefObject<(() => void) | null>;
}

// ─── ViewportComponent ─────────────────────────────────────────────────────────
/**
 * Pure WebGL canvas wrapper. All HUD controls live in WorkspaceCenter.tsx.
 * Exposes camera commands to the parent via optional callback refs.
 */
export const ViewportComponent: React.FC<ViewportProps> = ({ fitViewRef, resetCameraRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef    = useRef<Engine | null>(null);

  // ── Zustand atomic selectors ──────────────────────────────────────────────
  const currentAssembly    = useAssemblyStore((s) => s.currentAssembly);
  const selectedPartId     = useAssemblyStore((s) => s.selectedPartId);
  const explosionFactor    = useAssemblyStore((s) => s.explosionFactor);
  const setSelectedPartId  = useAssemblyStore((s) => s.setSelectedPartId);
  const setHoveredPartId   = useAssemblyStore((s) => s.setHoveredPartId);

  // ── Mount engine ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new SceneManager(container);
    const rig = new CameraRig(scene.camera, scene.renderer.domElement, {
      enableDamping: true,
      minDistance: 0.5,
      maxDistance: 50,
    });
    const explode   = new ExplodeController();
    const raycaster = new InteractionRaycaster(
      scene.camera,
      scene.renderer.domElement,
      scene.partsRoot,
      {
        onSelect: setSelectedPartId,
        onHover:  setHoveredPartId,
      },
    );

    const clock = new THREE.Clock();
    let animId = 0;
    const tick = (): void => {
      animId = requestAnimationFrame(tick);
      rig.update(clock.getDelta() * 1000);
      scene.renderer.render(scene.scene, scene.camera);
    };
    tick();

    engineRef.current = { scene, rig, explode, raycaster, animId, clock };

    return () => {
      cancelAnimationFrame(animId);
      raycaster.dispose();
      explode.dispose();
      rig.dispose();
      scene.dispose();
      engineRef.current = null;
    };
  }, [setSelectedPartId, setHoveredPartId]);

  // ── Register camera callbacks for parent HUD ──────────────────────────────
  useEffect(() => {
    const fitView = (): void => {
      const eng = engineRef.current;
      if (!eng) return;
      const box = eng.scene.getBoundingBox();
      if (!box.isEmpty()) eng.rig.focusOnBounds(box, 700);
    };
    const resetCam = (): void => {
      const eng = engineRef.current;
      if (!eng) return;
      const box = eng.scene.getBoundingBox();
      if (!box.isEmpty()) eng.rig.focusOnBounds(box, 700);
    };
    if (fitViewRef)      fitViewRef.current      = fitView;
    if (resetCameraRef)  resetCameraRef.current  = resetCam;

    return () => {
      if (fitViewRef)     fitViewRef.current     = null;
      if (resetCameraRef) resetCameraRef.current = null;
    };
  }, [fitViewRef, resetCameraRef]);

  // ── Sync assembly parts ───────────────────────────────────────────────────
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng || !currentAssembly?.parts.length) return;

    eng.scene.loadParts(currentAssembly.parts);
    eng.raycaster.snapshotMaterials();
    eng.explode.registerParts(currentAssembly.parts, eng.scene.partsRoot);

    const box = eng.scene.getBoundingBox();
    if (!box.isEmpty()) eng.rig.focusOnBounds(box, 900);
  }, [currentAssembly]);

  // ── Sync selection → highlight + camera focus ─────────────────────────────
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    eng.raycaster.syncSelection(selectedPartId);

    if (selectedPartId) {
      const mesh = eng.scene.getMeshByPartId(selectedPartId);
      if (mesh) eng.rig.focusOnBounds(new THREE.Box3().setFromObject(mesh), 550);
    }
  }, [selectedPartId]);

  // ── Sync explosion ────────────────────────────────────────────────────────
  useEffect(() => {
    engineRef.current?.explode.setFactor(explosionFactor);
  }, [explosionFactor]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-zinc-950"
      style={{ cursor: 'grab' }}
    />
  );
};
