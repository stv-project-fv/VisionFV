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
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40 transition group">
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-100 leading-snug truncate">{asm.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono text-blue-400">{asm.code}</span>
          <span className="text-slate-700">·</span>
          <span className="text-[10px] text-slate-500">{asm.manufacturer}</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-slate-600 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
            {asm.installed_position}
          </span>
          <span className="text-[10px] text-slate-600 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
            {asm.category}
          </span>
        </div>
      </div>

      {/* Open button */}
      <button
        onClick={() => onOpen(asm.id)}
        disabled={isLoading}
        className={clsx(
          'shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition',
          'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60 disabled:cursor-not-allowed',
          'group-hover:shadow-lg group-hover:shadow-blue-500/20'
        )}
        title={`Open 3D workspace for ${asm.name}`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <Wrench className="w-3.5 h-3.5" />
            <ChevronRight className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  );
};

// ── SubsystemSelector ─────────────────────────────────────────────────────────

export const SubsystemSelector: React.FC = () => {
  const selectedVehicle      = useAssemblyStore((s) => s.selectedVehicle);
  const isLoading            = useAssemblyStore((s) => s.isLoading);
  const openAssemblyWorkspace = useAssemblyStore((s) => s.openAssemblyWorkspace);

  const assemblies = selectedVehicle?.assemblies ?? [];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/95 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-100">
          Mechanical Subsystems
        </h2>
        {selectedVehicle ? (
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {selectedVehicle.brand} {selectedVehicle.model}
            <span className="text-slate-600 ml-1">· {selectedVehicle.internal_code}</span>
          </p>
        ) : (
          <p className="text-[11px] text-slate-600 mt-0.5">Select a vehicle from the fleet</p>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {!selectedVehicle ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-8">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <PackageOpen className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-1">No vehicle selected</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click on a vehicle in the fleet catalog to see its installed mechanical subsystems.
              </p>
            </div>
          </div>
        ) : assemblies.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
            No subsystems linked to this vehicle.
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
        <div className="shrink-0 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600">
          {assemblies.length} subsystem{assemblies.length !== 1 ? 's' : ''} · Click a row to open 3D workspace
        </div>
      )}
    </div>
  );
};
