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
  <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-800/60 last:border-0">
    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold shrink-0">
      {label}
    </span>
    <span className="text-xs text-slate-200 text-right">{value}</span>
  </div>
);

// ─── ManualDrawer ─────────────────────────────────────────────────────────

export const ManualDrawer: React.FC = () => {
  const getSelectedPart   = useAssemblyStore((s) => s.getSelectedPart);
  const currentAssembly   = useAssemblyStore((s) => s.currentAssembly);
  const setSelectedPartId = useAssemblyStore((s) => s.setSelectedPartId);

  const selectedPart = getSelectedPart();
  const [page, setPage] = useState<number>(selectedPart?.manual_page ?? 1);

  // Sync page when a new part is selected
  React.useEffect(() => {
    if (selectedPart?.manual_page) setPage(selectedPart.manual_page);
  }, [selectedPart]);

  const maxPage = 12;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-100">
              Service Manual
            </h2>
            {currentAssembly?.manual_pdf_url && (
              <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
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
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            {page} / {maxPage}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-4">
        {/* ── Selected part technical datasheet ─────────────────────────── */}
        {selectedPart ? (
          <>
            {/* Part header card */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold mb-0.5">
                    Selected Component
                  </p>
                  <h3 className="text-sm font-bold text-slate-100 leading-snug">
                    {selectedPart.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPartId(null)}
                  className="shrink-0 text-slate-500 hover:text-red-400 transition"
                  title="Clear selection"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Technical specs */}
              <div className="bg-slate-950/60 rounded-lg px-3 py-1 border border-slate-800">
                <SpecRow
                  label="OEM Code"
                  value={
                    <span className="font-mono text-blue-400">{selectedPart.oem_code}</span>
                  }
                />
                {selectedPart.category && (
                  <SpecRow
                    label="Category"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {selectedPart.category}
                      </span>
                    }
                  />
                )}
                <SpecRow
                  label="Torque Spec"
                  value={
                    selectedPart.torque_spec ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-mono font-bold">
                        <Wrench className="w-3 h-3" />
                        {selectedPart.torque_spec}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )
                  }
                />
                <SpecRow
                  label="Manual Page"
                  value={
                    selectedPart.manual_page != null ? (
                      <span className="inline-flex items-center gap-1 text-amber-400 font-mono">
                        <Hash className="w-3 h-3" />
                        {selectedPart.manual_page}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )
                  }
                />
                <SpecRow
                  label="Explode Vector"
                  value={
                    <span className="font-mono text-slate-400 text-[11px]">
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
                    Apply torque in a cross pattern using a calibrated wrench. Do not exceed
                    specified value to avoid thread damage.
                  </span>
                </div>
              )}
            </div>

            {/* ── Workshop manual page body ──────────────────────────────── */}
            <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Section 4.{page} — Maintenance &amp; Disassembly
              </div>
              <h4 className="text-sm font-bold text-slate-100">
                Step {page}: Fastening &amp; Torque Procedure
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ensure all mating surfaces are clean and degreased. Insert fasteners finger-tight
                first, then bring to full torque in a star pattern across 3 stages (30% → 70% →
                100%). Verify with a digital torque indicator after the final pass.
              </p>
              <div className="mt-auto grid grid-cols-1 gap-1 text-[11px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded-lg p-3">
                <span>&gt; Standard: ISO 12100:2010</span>
                <span>&gt; Tooling: 0-150 Nm torque driver required</span>
                <span>&gt; Lubricant: Anti-seize compound (copper-based)</span>
              </div>
            </div>
          </>
        ) : (
          /* ── No-selection empty state ───────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-1">
                No component selected
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click a part in the 3D viewport or eBOM table to display its technical
                datasheet and service manual page here.
              </p>
            </div>

            {/* Still show the manual page body */}
            <div className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-600 font-mono">
                <FileText className="w-3.5 h-3.5 text-amber-400/50" />
                Page {page} · General Reference
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Navigate with the arrows above to browse the workshop manual. Select a component
                to jump directly to its associated page and datasheet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
