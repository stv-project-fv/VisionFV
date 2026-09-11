import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { PartsTable } from './PartsTable';
import { ASSEMBLY_CATEGORY_ICONS } from '@/types';
import { PackageOpen, Layers } from 'lucide-react';

// ─── LivePartsPanel ────────────────────────────────────────────────────────────
/**
 * Right-column panel that wraps PartsTable with a contextual assembly header.
 * Always visible — bidirectional sync between 3D mesh clicks and row selection
 * is handled entirely inside PartsTable.
 */
export const LivePartsPanel: React.FC = () => {
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);

  if (!currentAssembly) {
    return (
      <aside className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-zinc-800/70 bg-zinc-950">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-600 shrink-0" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
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
      <div className="shrink-0 px-4 py-3 border-b border-zinc-800/70 bg-zinc-900/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base leading-none" aria-hidden="true">
                {categoryIcon}
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200 truncate">
                eBOM en Vivo
              </h2>
            </div>
            <p className="text-[11px] text-zinc-300 font-semibold truncate" title={currentAssembly.name}>
              {currentAssembly.name}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate">
              {currentAssembly.manufacturer} · {currentAssembly.code}
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold whitespace-nowrap">
            {currentAssembly.parts.length} pzas.
          </span>
        </div>
      </div>

      {/* PartsTable fills remaining height */}
      <div className="flex-1 min-h-0">
        <PartsTable />
      </div>
    </aside>
  );
};
