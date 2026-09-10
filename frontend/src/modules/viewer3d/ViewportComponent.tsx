import React, { useCallback, useEffect, useRef } from 'react';
import { RotateCcw, Expand, Maximize2 } from 'lucide-react';
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { CameraRig } from './CameraRig';
import { ExplodeController } from './ExplodeController';
import { InteractionRaycaster } from './InteractionRaycaster';
import { useAssemblyStore } from '@/store/useAssemblyStore';

// ─── Engine bundle ─────────────────────────────────────────────────────────

interface Engine {
  scene: SceneManager;
  rig: CameraRig;
  explode: ExplodeController;
  raycaster: InteractionRaycaster;
  animId: number;
  clock: THREE.Clock;
}

// ─── ViewportComponent ────────────────────────────────────────────────────

export const ViewportComponent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);

  // ── Zustand atomic selectors ──────────────────────────────────────────────
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const selectedPartId  = useAssemblyStore((s) => s.selectedPartId);
  const explosionFactor = useAssemblyStore((s) => s.explosionFactor);
  const setSelectedPartId = useAssemblyStore((s) => s.setSelectedPartId);
  const setHoveredPartId  = useAssemblyStore((s) => s.setHoveredPartId);
  const setExplosionFactor = useAssemblyStore((s) => s.setExplosionFactor);
  const resetSelection    = useAssemblyStore((s) => s.resetSelection);

  // ── Mount engine ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene    = new SceneManager(container);
    const rig      = new CameraRig(scene.camera, scene.renderer.domElement, {
      enableDamping: true,
      minDistance: 0.5,
      maxDistance: 50,
    });
    const explode  = new ExplodeController();
    const raycaster = new InteractionRaycaster(
      scene.camera,
      scene.renderer.domElement,
      scene.partsRoot,
      {
        onSelect: setSelectedPartId,
        onHover:  setHoveredPartId,
      }
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

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleReset = useCallback((): void => {
    resetSelection();
    const eng = engineRef.current;
    if (!eng) return;
    const box = eng.scene.getBoundingBox();
    if (!box.isEmpty()) eng.rig.focusOnBounds(box, 700);
  }, [resetSelection]);

  const handleFitView = useCallback((): void => {
    const eng = engineRef.current;
    if (!eng) return;
    const box = eng.scene.getBoundingBox();
    if (!box.isEmpty()) eng.rig.focusOnBounds(box, 700);
  }, []);

  const percent = Math.round(explosionFactor * 100);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full min-h-[420px] flex flex-col">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden rounded-xl bg-slate-950 border border-slate-800 shadow-inner"
        style={{ cursor: 'grab' }}
      />

      {/* ── Overlay: HUD top-left ──────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none select-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700/60 text-xs font-medium text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          3D Viewport · WebGL
        </div>
        <div className="px-3 py-1 rounded-md bg-slate-950/70 border border-slate-800/70 text-[10px] font-mono text-slate-500">
          Drag · Scroll · Ctrl+drag pan
        </div>
      </div>

      {/* ── Overlay: action buttons top-right ─────────────────────────────── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleFitView}
          title="Fit all parts in view"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white transition text-xs"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Fit View
        </button>
        <button
          onClick={handleReset}
          title="Reset selection and camera"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white transition text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* ── Overlay: explode slider bottom ────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(90%,480px)]">
        <div className="px-4 py-3 rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700/60 shadow-xl flex items-center gap-4">
          <Expand className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Explode View
              </span>
              <span
                className="text-xs font-mono font-bold text-blue-400 tabular-nums"
                style={{ minWidth: '3ch', textAlign: 'right' }}
              >
                {percent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explosionFactor}
              onChange={(e) => setExplosionFactor(parseFloat(e.target.value))}
              className="w-full h-2 accent-blue-500 cursor-pointer rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
