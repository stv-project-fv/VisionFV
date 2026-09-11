import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { PartsTable } from './PartsTable';
import { ASSEMBLY_CATEGORY_ICONS } from '@/types';
import { PackageOpen, Layers } from 'lucide-react';

// ─── LivePartsPanel ────────────────────────────────────────────────────────────
/**
 * Right-column panel. Renders assembly context header + headless PartsTable.
 * Bidirectional 3D↔row sync is handled inside PartsTable.
 */
export const LivePartsPanel: React.FC = () => {
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);

  if (!currentAssembly) {
    return (
      <aside className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-zinc-800/70">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              eBOM en Vivo
            </h2>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-5 py-8">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <PackageOpen className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-1">Sin subsistema activo</p>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Seleccione un subsistema en el explorador para ver su lista de materiales.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const categoryIcon = ASSEMBLY_CATEGORY_ICONS[currentAssembly.category] ?? '⚙️';

  return (
    <aside className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 overflow-hidden">
      {/* Assembly context header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-zinc-800/70 bg-zinc-900/40">
        {/* Top row: icon + label + part count badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm leading-none shrink-0" aria-hidden="true">
            {categoryIcon}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex-1 truncate">
            eBOM en Vivo
          </span>
          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
            {currentAssembly.parts.length} pzas.
          </span>
        </div>

        {/* Assembly name */}
        <p
          className="text-xs font-semibold text-zinc-100 truncate leading-tight"
          title={currentAssembly.name}
        >
          {currentAssembly.name}
        </p>

        {/* Manufacturer · code */}
        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate">
          {currentAssembly.manufacturer}
          <span className="text-zinc-700 mx-1">·</span>
          {currentAssembly.code}
        </p>
      </div>

      {/* PartsTable in headless mode fills remaining height */}
      <div className="flex-1 min-h-0">
        <PartsTable headless />
      </div>
    </aside>
  );
};
