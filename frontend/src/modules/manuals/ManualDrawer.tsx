import React from "react";
import {
  BookOpen,
  Wrench,
  Tag,
  Hash,
  Info,
  XCircle,
} from "lucide-react";
import { useAssemblyStore } from "@/store/useAssemblyStore";
import { ManualViewer } from "./ManualViewer";

// -- Spec row helper ----------------------------------------------------------

const SpecRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-zinc-800/60 last:border-0">
    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold shrink-0">
      {label}
    </span>
    <span className="text-xs text-zinc-200 text-right">{value}</span>
  </div>
);

// -- ManualDrawer -------------------------------------------------------------

export const ManualDrawer: React.FC = () => {
  const getSelectedPart   = useAssemblyStore((s) => s.getSelectedPart);
  const setSelectedPartId = useAssemblyStore((s) => s.setSelectedPartId);
  const activeManual      = useAssemblyStore((s) => s.activeManual);

  const selectedPart = getSelectedPart();

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center gap-2 shrink-0">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex-1">
          {activeManual ? activeManual.title : "Manual de Servicio"}
        </h2>
        {activeManual && (
          <span className="text-[10px] font-mono text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">
            {activeManual.total_pages} págs.
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Selected part technical datasheet */}
        {selectedPart && (
          <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold mb-0.5">
                    Componente Seleccionado
                  </p>
                  <h3 className="text-xs font-bold text-zinc-100 leading-snug">
                    {selectedPart.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPartId(null)}
                  className="shrink-0 text-zinc-500 hover:text-red-400 transition"
                  title="Limpiar selección"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Technical specs */}
              <div className="bg-zinc-950/70 rounded-lg px-2 py-0.5 border border-zinc-800/60">
                <SpecRow
                  label="Código OEM"
                  value={
                    <span className="font-mono text-blue-400 font-semibold">{selectedPart.oem_code}</span>
                  }
                />
                {selectedPart.category && (
                  <SpecRow
                    label="Categoría"
                    value={
                      <span className="inline-flex items-center gap-1 text-zinc-300">
                        <Tag className="w-3 h-3 text-zinc-400" />
                        {selectedPart.category}
                      </span>
                    }
                  />
                )}
                <SpecRow
                  label="Torque"
                  value={
                    selectedPart.torque_spec ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-mono font-bold">
                        <Wrench className="w-3 h-3" />
                        {selectedPart.torque_spec}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )
                  }
                />
                <SpecRow
                  label="Pág. Manual"
                  value={
                    selectedPart.manual_page != null ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-mono">
                        <Hash className="w-3 h-3" />
                        {selectedPart.manual_page}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )
                  }
                />
                {selectedPart.figure_code && (
                  <SpecRow
                    label="Figura"
                    value={<span className="font-mono text-zinc-300">{selectedPart.figure_code}</span>}
                  />
                )}
              </div>

              {/* Torque warning */}
              {selectedPart.torque_spec && (
                <div className="flex items-start gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Aplique el torque en patrón cruzado. No exceda el valor especificado.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ManualViewer (compact) — fills remaining space */}
        <div className="flex-1 min-h-0">
          <ManualViewer compact />
        </div>
      </div>
    </div>
  );
};
