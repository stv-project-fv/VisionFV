import React from 'react';
import {
  Layers,
  BookOpen,
  Columns,
  Maximize2,
  RotateCcw,
  Expand,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { ViewportComponent } from '@/modules/viewer3d/ViewportComponent';
import { ManualDrawer } from '@/modules/manuals/ManualDrawer';
import clsx from 'clsx';
import type { ActiveTab } from '@/types';

// ─── HUD: View Mode Switcher ──────────────────────────────────────────────────

const ViewModeHUD: React.FC = () => {
  const activeTab    = useAssemblyStore((s) => s.activeTab);
  const setActiveTab = useAssemblyStore((s) => s.setActiveTab);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: '3d',     label: '3D',      icon: Layers   },
    { id: 'split',  label: 'Dividida', icon: Columns  },
    { id: 'manual', label: 'Manual',   icon: BookOpen },
  ];

  return (
    <div className="flex items-center gap-0.5 bg-zinc-900/90 backdrop-blur border border-zinc-700/70 rounded-lg p-0.5 shadow-lg">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          title={`Vista ${label}`}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
            activeTab === id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── HUD: Camera Controls ─────────────────────────────────────────────────────

interface CameraControlsHUDProps {
  onFitView: () => void;
  onReset: () => void;
}

const CameraControlsHUD: React.FC<CameraControlsHUDProps> = ({ onFitView, onReset }) => (
  <div className="flex items-center bg-zinc-900/90 backdrop-blur border border-zinc-700/70 rounded-lg p-1 shadow-lg gap-1">
    <button
      type="button"
      onClick={onFitView}
      title="Ajustar todas las piezas en la vista"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition text-xs font-medium"
    >
      <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
      <span>Ajustar</span>
    </button>
    <div className="w-[1px] h-4 bg-zinc-700/80" />
    <button
      type="button"
      onClick={onReset}
      title="Restablecer selección y posición de cámara"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition text-xs font-medium"
    >
      <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
      <span>Reset</span>
    </button>
  </div>
);

// ─── HUD: Explode Slider ──────────────────────────────────────────────────────

const ExplodeSliderHUD: React.FC = () => {
  const explosionFactor    = useAssemblyStore((s) => s.explosionFactor);
  const setExplosionFactor = useAssemblyStore((s) => s.setExplosionFactor);
  const percent = Math.round(explosionFactor * 100);

  return (
    <div className="w-[min(90%,420px)]">
      <div className="px-4 py-2.5 rounded-xl bg-zinc-900/90 backdrop-blur border border-zinc-700/70 shadow-2xl flex items-center gap-3">
        <Expand className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Despiece 3D
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
            className="w-full h-1.5 accent-blue-500 cursor-pointer rounded-full bg-zinc-800"
          />
        </div>
      </div>
    </div>
  );
};

// ─── Empty state when no assembly is loaded ───────────────────────────────────

const EmptyWorkspace: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 select-none">
    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
      <Layers className="w-7 h-7 text-zinc-600" />
    </div>
    <div className="text-center max-w-xs">
      <p className="text-sm font-semibold text-zinc-400 mb-1">Ningún subsistema activo</p>
      <p className="text-xs text-zinc-600 leading-relaxed">
        Seleccione un vehículo en el explorador izquierdo y haga clic en un subsistema para cargar su vista 3D.
      </p>
    </div>
  </div>
);

// ─── WorkspaceCenter ──────────────────────────────────────────────────────────

/**
 * Central viewport host.
 * Renders the 3D canvas, PDF manual, or split view based on `activeTab`.
 * Hosts all floating HUD overlays so ViewportComponent is a pure canvas wrapper.
 *
 * Camera control callbacks are passed via a ref bridge exposed by ViewportComponent.
 */
export const WorkspaceCenter: React.FC = () => {
  const activeTab       = useAssemblyStore((s) => s.activeTab);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const isLoading       = useAssemblyStore((s) => s.isLoading);
  const error           = useAssemblyStore((s) => s.error);
  const resetSelection  = useAssemblyStore((s) => s.resetSelection);

  // Camera controls are driven via a callback ref registered by ViewportComponent.
  const fitViewRef  = React.useRef<(() => void) | null>(null);
  const resetCamRef = React.useRef<(() => void) | null>(null);

  const handleFitView = (): void => { fitViewRef.current?.(); };
  const handleReset   = (): void => {
    resetSelection();
    resetCamRef.current?.();
  };

  const show3D    = activeTab === '3d' || activeTab === 'split';

  return (
    <main className="flex-1 min-w-0 relative flex flex-col bg-zinc-950 overflow-hidden">
      {/* ── Global Loading Overlay ──────────────────────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-sm text-zinc-300">Cargando ensamblaje…</span>
          </div>
        </div>
      )}

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && !currentAssembly && (
        <div className="absolute top-0 left-0 right-0 z-40 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2 text-amber-200 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── No assembly loaded ──────────────────────────────────────────────── */}
      {!currentAssembly && !isLoading && (
        <EmptyWorkspace />
      )}

      {/* ── Viewport Content ────────────────────────────────────────────────── */}
      {currentAssembly && (
        <>
          {/* Split: viewport on top, manual on bottom */}
          {activeTab === 'split' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 relative">
                <ViewportComponent
                  fitViewRef={fitViewRef}
                  resetCameraRef={resetCamRef}
                />
              </div>
              <div className="h-[38%] min-h-0 border-t border-zinc-800">
                <ManualDrawer />
              </div>
            </div>
          )}

          {/* 3D Only */}
          {activeTab === '3d' && (
            <div className="flex-1 min-h-0 relative">
              <ViewportComponent
                fitViewRef={fitViewRef}
                resetCameraRef={resetCamRef}
              />
            </div>
          )}

          {/* Manual Only */}
          {activeTab === 'manual' && (
            <div className="flex-1 min-h-0">
              <ManualDrawer />
            </div>
          )}

          {/* ── Floating HUD: Top-left — view mode toggle ─────────────────── */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 select-none pointer-events-auto">
            <ViewModeHUD />
          </div>

          {/* ── Floating HUD: Top-right — camera controls (3D/split only) ─── */}
          {show3D && (
            <div className="absolute top-3 right-3 z-30 select-none pointer-events-auto">
              <CameraControlsHUD onFitView={handleFitView} onReset={handleReset} />
            </div>
          )}

          {/* ── Floating HUD: Bottom-center — explode slider (3D/split only) */}
          {show3D && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 select-none pointer-events-auto">
              <ExplodeSliderHUD />
            </div>
          )}
        </>
      )}
    </main>
  );
};
