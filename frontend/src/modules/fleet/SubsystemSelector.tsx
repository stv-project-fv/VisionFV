import React from 'react';
import { ChevronRight, Loader2, Wrench, PackageOpen } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import type { InstalledAssembly } from '@/types';
import { ASSEMBLY_CATEGORY_ICONS } from '@/types';
import clsx from 'clsx';

// ── Assembly row ──────────────────────────────────────────────────────────────

interface AssemblyRowProps {
  asm: InstalledAssembly;
  onOpen: (id: string) => void;
  isLoading: boolean;
}

const AssemblyRow: React.FC<AssemblyRowProps> = ({ asm, onOpen, isLoading }) => {
  const icon = ASSEMBLY_CATEGORY_ICONS[asm.category] ?? '⚙️';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-800/50 transition group">
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-zinc-100 leading-snug truncate">{asm.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono text-blue-400 font-semibold">{asm.code}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-[10px] text-zinc-400">{asm.manufacturer}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[10px] text-zinc-300 bg-zinc-800/90 border border-zinc-700 px-1.5 py-0.5 rounded font-medium">
            {asm.installed_position}
          </span>
          <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-medium">
            {asm.category}
          </span>
        </div>
      </div>

      {/* Open button */}
      <button
        onClick={() => onOpen(asm.id)}
        disabled={isLoading}
        className={clsx(
          'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition shadow-sm',
          'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 disabled:cursor-not-allowed',
          'group-hover:shadow-md group-hover:shadow-blue-500/20'
        )}
        title={`Abrir espacio 3D para ${asm.name}`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver 3D</span>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  );
};

// ── SubsystemSelector ─────────────────────────────────────────────────────────

export const SubsystemSelector: React.FC = () => {
  const selectedVehicle = useAssemblyStore((s) => s.selectedVehicle);
  const isLoading = useAssemblyStore((s) => s.isLoading);
  const openAssemblyWorkspace = useAssemblyStore((s) => s.openAssemblyWorkspace);

  const assemblies = selectedVehicle?.assemblies ?? [];

  return (
    <div className="flex flex-col h-full bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
          Subsistemas Mecánicos
        </h2>
        {selectedVehicle ? (
          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
            {selectedVehicle.brand} {selectedVehicle.model}
            <span className="text-zinc-500 ml-1">· {selectedVehicle.internal_code}</span>
          </p>
        ) : (
          <p className="text-[11px] text-zinc-500 mt-0.5">Seleccione un vehículo de la flota</p>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {!selectedVehicle ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-8">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center">
              <PackageOpen className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300 mb-1">Sin vehículo seleccionado</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Haga clic en un vehículo del catálogo para ver sus subsistemas mecánicos instalados y explorar su despiece 3D.
              </p>
            </div>
          </div>
        ) : assemblies.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            No hay subsistemas vinculados a este vehículo.
          </div>
        ) : (
          assemblies.map((asm) => (
            <AssemblyRow
              key={asm.id}
              asm={asm}
              isLoading={isLoading}
              onOpen={openAssemblyWorkspace}
            />
          ))
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {selectedVehicle && assemblies.length > 0 && (
        <div className="shrink-0 px-4 py-2 border-t border-zinc-800 text-[10px] text-zinc-500 bg-zinc-950/40">
          {assemblies.length} {assemblies.length === 1 ? 'subsistema' : 'subsistemas'} · Clic en una fila para abrir espacio 3D
        </div>
      )}
    </div>
  );
};
