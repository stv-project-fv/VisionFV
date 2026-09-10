import React, { useState, useEffect } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { BookOpen, ChevronLeft, ChevronRight, FileText, AlertCircle } from 'lucide-react';

export const ManualViewer: React.FC = () => {
  const getSelectedPart = useAssemblyStore((s) => s.getSelectedPart);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);

  const selectedPart = getSelectedPart();
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (selectedPart?.manual_page) {
      setCurrentPage(selectedPart.manual_page);
    }
  }, [selectedPart]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Interactive Service Manual
            </h2>
            {currentAssembly?.manual_pdf_url && (
              <p className="text-[11px] text-slate-400 font-mono">
                {currentAssembly.manual_pdf_url}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300 px-2 py-0.5 rounded bg-slate-800">
            Page {currentPage} / 12
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(12, p + 1))}
            disabled={currentPage >= 12}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-slate-950/50 flex flex-col gap-4">
        {selectedPart && (
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-300">Synchronized Component Context:</p>
              <p className="mt-1">
                Displaying assembly instructions for <strong>{selectedPart.name}</strong> (OEM:{' '}
                <span className="font-mono">{selectedPart.oem_code}</span>).
                {selectedPart.torque_spec && (
                  <span className="block mt-0.5 text-emerald-400 font-mono">
                    Target Torque: {selectedPart.torque_spec}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 border border-slate-800 rounded-lg p-6 bg-slate-900/60 shadow-inner flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-widest font-mono mb-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Section 4.{currentPage} — Maintenance &amp; Disassembly Procedure
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-4">
              Assembly Step #{currentPage}: Fastening &amp; Torque Requirements
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Ensure all mating surfaces are free of debris and degreased. Align locating pins
              before threading primary fasteners. Apply calibrated torque wrench to the specified
              limit in a criss-cross pattern.
            </p>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs font-mono text-slate-400 space-y-1">
              <div>&gt; Safety Protocol: ISO 12100 Compliant</div>
              <div>&gt; Recommended Tooling: Calibrated Torque Driver [0-100 Nm]</div>
              <div>&gt; Lubrication: Apply high-temp anti-seize paste where noted</div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <span>VISION3DPARTS Technical Documentation Engine</span>
            <span>Doc Rev 2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
