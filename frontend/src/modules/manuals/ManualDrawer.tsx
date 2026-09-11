import React from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Wrench,
  Tag,
  Hash,
  Info,
  XCircle,
} from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useState } from 'react';

// ── Spec row helper ────────────────────────────────────────────────────────

const SpecRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-zinc-800/60 last:border-0">
    <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold shrink-0">
      {label}
    </span>
    <span className="text-xs text-zinc-200 text-right">{value}</span>
  </div>
);

// ─── ManualDrawer ─────────────────────────────────────────────────────────

export const ManualDrawer: React.FC = () => {
  const getSelectedPart   = useAssemblyStore((s) => s.getSelectedPart);
  const currentAssembly   = useAssemblyStore((s) => s.currentAssembly);
  const setSelectedPartId = useAssemblyStore((s) => s.setSelectedPartId);

  const selectedPart = getSelectedPart();
  const [page, setPage] = useState<number>(selectedPart?.manual_page ?? 1);
  const [prevPartId, setPrevPartId] = useState<string | null>(selectedPart?.id ?? null);

  // Sync page when selected part changes during render
  if (selectedPart && selectedPart.id !== prevPartId) {
    setPrevPartId(selectedPart.id);
    if (selectedPart.manual_page) {
      setPage(selectedPart.manual_page);
    }
  } else if (!selectedPart && prevPartId !== null) {
    setPrevPartId(null);
  }

  const maxPage = 12;

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
              Manual de Servicio
            </h2>
            {currentAssembly?.manual_pdf_url && (
              <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[200px]">
                {currentAssembly.manual_pdf_url}
              </p>
            )}
          </div>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200 transition"
            title="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            {page} / {maxPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-400 hover:text-zinc-200 transition"
            title="Página siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {/* ── Selected part technical datasheet ─────────────────────────── */}
        {selectedPart ? (
          <>
            {/* Part header card */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-blue-400 font-semibold mb-0.5">
                    Componente Seleccionado
                  </p>
                  <h3 className="text-sm font-bold text-zinc-100 leading-snug">
                    {selectedPart.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPartId(null)}
                  className="shrink-0 text-zinc-500 hover:text-red-400 transition"
                  title="Limpiar selección"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Technical specs */}
              <div className="bg-zinc-950/70 rounded-lg px-3 py-1 border border-zinc-850">
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
                <SpecRow
                  label="Vector Despiece"
                  value={
                    <span className="font-mono text-zinc-400 text-[11px]">
                      [{selectedPart.explode_vector_x.toFixed(2)},&nbsp;
                      {selectedPart.explode_vector_y.toFixed(2)},&nbsp;
                      {selectedPart.explode_vector_z.toFixed(2)}]
                    </span>
                  }
                />
              </div>

              {/* Warning: torque critical */}
              {selectedPart.torque_spec && (
                <div className="flex items-start gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Aplique el torque en patrón cruzado con llave calibrada. No exceda el valor especificado para evitar daños en las roscas.
                  </span>
                </div>
              )}
            </div>

            {/* ── Workshop manual page body ──────────────────────────────── */}
            <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Sección 4.{page} — Mantenimiento y Desensamble
              </div>
              <h4 className="text-sm font-bold text-zinc-100">
                Paso {page}: Procedimiento de Ajuste y Fijación
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Asegúrese de que todas las superficies de contacto estén limpias y desengrasadas. Ajuste los pernos primero manualmente al tope, luego aplique el torque total en patrón en estrella a lo largo de 3 etapas (30% → 70% → 100%). Verifique con un torquímetro calibrado tras la pasada final.
              </p>
              <div className="mt-auto grid grid-cols-1 gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <span>&gt; Norma: ISO 12100:2010</span>
                <span>&gt; Herramienta: Torquímetro 0-150 Nm requerido</span>
                <span>&gt; Lubricante: Compuesto antiengranante (base cobre)</span>
              </div>
            </div>
          </>
        ) : (
          /* ── No-selection empty state ───────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300 mb-1">
                Sin componente seleccionado
              </p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Haga clic en una pieza del visor 3D o de la tabla eBOM para mostrar su ficha técnica y página del manual de servicio aquí.
              </p>
            </div>

            {/* Still show the manual page body */}
            <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                <FileText className="w-3.5 h-3.5 text-amber-400/60" />
                Página {page} · Referencia General
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Navegue con las flechas superiores para explorar el manual de taller. Seleccione un componente para saltar directamente a su ficha técnica asociada.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
