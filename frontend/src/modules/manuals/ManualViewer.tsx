import React, { useState } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { BookOpen, ChevronLeft, ChevronRight, FileText, AlertCircle } from 'lucide-react';

export const ManualViewer: React.FC = () => {
  const getSelectedPart = useAssemblyStore((s) => s.getSelectedPart);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);

  const selectedPart = getSelectedPart();
  const [currentPage, setCurrentPage] = useState<number>(selectedPart?.manual_page ?? 1);
  const [prevPartId, setPrevPartId] = useState<string | null>(selectedPart?.id ?? null);

  if (selectedPart && selectedPart.id !== prevPartId) {
    setPrevPartId(selectedPart.id);
    if (selectedPart.manual_page) {
      setCurrentPage(selectedPart.manual_page);
    }
  } else if (!selectedPart && prevPartId !== null) {
    setPrevPartId(null);
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
              Manual de Servicio Interactivo
            </h2>
            {currentAssembly?.manual_pdf_url && (
              <p className="text-[11px] text-zinc-400 font-mono">
                {currentAssembly.manual_pdf_url}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300"
            title="Página Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-zinc-300 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            Página {currentPage} / 12
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(12, p + 1))}
            disabled={currentPage >= 12}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300"
            title="Página Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-zinc-950/50 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {selectedPart && (
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-blue-300">Contexto de Componente Sincronizado:</p>
              <p className="mt-1">
                Visualizando instrucciones para <strong>{selectedPart.name}</strong> (OEM:{' '}
                <span className="font-mono">{selectedPart.oem_code}</span>).
                {selectedPart.torque_spec && (
                  <span className="block mt-0.5 text-emerald-400 font-mono">
                    Torque especificado: {selectedPart.torque_spec}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 border border-zinc-800 rounded-lg p-6 bg-zinc-900/60 shadow-inner flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wider font-mono mb-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Sección 4.{currentPage} — Procedimiento de Mantenimiento y Desensamble
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-4">
              Paso de Ensamblaje #{currentPage}: Requisitos de Ajuste y Torque
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              Asegúrese de que todas las superficies de contacto estén libres de impurezas y desengrasadas. Alinee las guías de posición antes de roscar los pernos primarios. Aplique torquímetro calibrado hasta el límite indicado en patrón cruzado.
            </p>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-xs font-mono text-zinc-400 space-y-1">
              <div>&gt; Protocolo de Seguridad: Conforme a ISO 12100</div>
              <div>&gt; Herramienta Recomendada: Torquímetro Calibrado [0-100 Nm]</div>
              <div>&gt; Lubricación: Aplique grasa antiadherente de alta temperatura donde se indique</div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
            <span>Motor de Documentación Técnica VISION3DPARTS</span>
            <span>Rev. Doc 2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
