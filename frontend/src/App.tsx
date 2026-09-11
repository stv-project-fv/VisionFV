import React from 'react';
import { Header } from '@/components/Header';
import { TreeExplorer } from '@/modules/navigation/TreeExplorer';
import { WorkspaceCenter } from '@/modules/viewer/WorkspaceCenter';
import { LivePartsPanel } from '@/modules/ebom/LivePartsPanel';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { Truck, Cpu } from 'lucide-react';

// ─── Status bar ────────────────────────────────────────────────────────────────

const StatusBar: React.FC = () => {
  const getSelectedPart   = useAssemblyStore((s) => s.getSelectedPart);
  const currentAssembly   = useAssemblyStore((s) => s.currentAssembly);
  const explosionFactor   = useAssemblyStore((s) => s.explosionFactor);
  const selectedVehicle   = useAssemblyStore((s) => s.selectedVehicle);
  const selected          = getSelectedPart();
  const partCount         = currentAssembly?.parts?.length ?? 0;

  return (
    <footer className="shrink-0 h-7 px-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[10px] font-sans text-zinc-400 gap-4 select-none">
      {/* Left: connection + active context */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
          <span className="text-zinc-300 font-medium">Conectado</span>
        </div>

        <span className="text-zinc-700">|</span>

        {selectedVehicle ? (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[10px] truncate">
            <Truck className="w-2.5 h-2.5 text-blue-400 shrink-0" />
            <span className="font-semibold text-blue-300">{selectedVehicle.internal_code}</span>
            <span className="text-zinc-500">·</span>
            <span className="truncate">{selectedVehicle.brand} {selectedVehicle.model}</span>
          </div>
        ) : (
          <span className="text-zinc-600 text-[10px]">Sin unidad activa</span>
        )}

        {currentAssembly && (
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[10px] truncate">
            <span className="text-zinc-500">Asm:</span>
            <span className="text-zinc-200 font-semibold truncate">{currentAssembly.name}</span>
          </div>
        )}

        {selected && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-950/40 border border-blue-800/60 text-blue-300 font-mono text-[10px] truncate">
            <span className="text-blue-400">Pieza:</span>
            <span className="font-semibold">{selected.oem_code}</span>
          </div>
        )}
      </div>

      {/* Right: stats + WebGL indicator */}
      <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
        {currentAssembly ? (
          <>
            <span className="text-zinc-400">
              <span className="text-zinc-500 font-sans">Piezas:</span>{' '}
              <strong className="text-zinc-200">{partCount}</strong>
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-400">
              <span className="text-zinc-500 font-sans">Despiece:</span>{' '}
              <strong className="text-blue-400">{Math.round(explosionFactor * 100)}%</strong>
            </span>
            <span className="text-zinc-700">|</span>
          </>
        ) : null}

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
          <Cpu className="w-2.5 h-2.5 text-emerald-400" />
          <span>WebGL</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">60 FPS</span>
        </div>
      </div>
    </footer>
  );
};

// ─── App — 3-Column Master Workspace ──────────────────────────────────────────

export const App: React.FC = () => (
  <div className="flex flex-col h-screen w-screen bg-zinc-950 text-slate-100 overflow-hidden font-sans">
    {/* Top bar */}
    <Header />

    {/* 3-column body */}
    <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
      {/* LEFT: Hierarchical tree explorer */}
      <div className="w-64 xl:w-72 shrink-0 overflow-hidden">
        <TreeExplorer />
      </div>

      {/* CENTER: Unified WebGL / PDF viewport */}
      <WorkspaceCenter />

      {/* RIGHT: Live eBOM & parts registry */}
      <div className="w-72 xl:w-80 shrink-0 overflow-hidden">
        <LivePartsPanel />
      </div>
    </div>

    {/* Bottom status bar */}
    <StatusBar />
  </div>
);

export default App;
