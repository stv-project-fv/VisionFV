import React, { useEffect, useRef } from 'react';
import { BookOpen, Wrench, Hash, Tag, AlertCircle } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import clsx from 'clsx';
import type { PartEntity } from '@/types';

// ─── Row component with auto-scroll ───────────────────────────────────────

interface RowProps {
  part: PartEntity;
  position: number;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onOpenManual: (id: string) => void;
}

const PartRow: React.FC<RowProps> = ({
  part,
  position,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onOpenManual,
}) => {
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Bidirectional sync: auto-scroll when selection comes from 3D viewport
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <tr
      ref={rowRef}
      onClick={() => onSelect(part.id)}
      onMouseEnter={() => onHover(part.id)}
      onMouseLeave={() => onHover(null)}
      className={clsx(
        'cursor-pointer transition-colors duration-100 group border-b border-zinc-850/60',
        isSelected
          ? 'bg-blue-600/20 border-l-[3px] border-l-blue-500'
          : isHovered
          ? 'bg-zinc-800/60'
          : 'hover:bg-zinc-800/30'
      )}
    >
      {/* Position (#) - w-12 */}
      <td className="py-2 px-2 text-center w-12 shrink-0">
        <span
          className={clsx(
            'inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold font-mono',
            isSelected
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'
          )}
        >
          {position}
        </span>
      </td>

      {/* OEM Code - w-36, whitespace-nowrap font-mono text-xs text-blue-400 */}
      <td className="py-2 px-2.5 w-36 shrink-0">
        <span className="whitespace-nowrap font-mono text-xs font-semibold text-blue-400 block truncate">
          {part.oem_code}
        </span>
      </td>

      {/* Description / Name + Category - flex-1 */}
      <td className="py-2 px-2.5 flex-1 min-w-[140px]">
        <p
          className={clsx(
            'text-xs font-medium leading-tight',
            isSelected ? 'text-blue-100 font-semibold' : 'text-zinc-200 group-hover:text-white'
          )}
        >
          {part.name}
        </p>
        {part.category && (
          <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
            <Tag className="w-2.5 h-2.5 text-zinc-500" />
            <span className="truncate">{part.category}</span>
          </p>
        )}
      </td>

      {/* Torque Specs - w-24 subtle technical tag */}
      <td className="py-2 px-2.5 w-24 shrink-0 whitespace-nowrap">
        {part.torque_spec ? (
          <span className="inline-flex items-center gap-1 border border-zinc-700 bg-zinc-800 px-2 py-0.5 rounded font-mono text-xs text-zinc-300 shadow-sm">
            <Wrench className="w-2.5 h-2.5 text-zinc-400" />
            <span>{part.torque_spec}</span>
          </span>
        ) : (
          <span className="text-zinc-600 text-xs font-mono">—</span>
        )}
      </td>

      {/* Action / Manual - w-20 */}
      <td className="py-2 px-2 text-center w-20 shrink-0 whitespace-nowrap">
        {part.manual_page != null ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenManual(part.id);
            }}
            title={`Abrir página ${part.manual_page} del manual`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/90 hover:bg-amber-500/20 hover:border-amber-500/40 border border-zinc-700/80 text-zinc-400 hover:text-amber-400 transition text-[10px] font-mono shadow-sm"
          >
            <BookOpen className="w-3 h-3 text-amber-400" />
            <span>pág.{part.manual_page}</span>
          </button>
        ) : (
          <span className="text-zinc-600 text-xs font-mono">—</span>
        )}
      </td>
    </tr>
  );
};

// ─── PartsTable ────────────────────────────────────────────────────────────

export const PartsTable: React.FC = () => {
  const currentAssembly   = useAssemblyStore((s) => s.currentAssembly);
  const selectedPartId    = useAssemblyStore((s) => s.selectedPartId);
  const hoveredPartId     = useAssemblyStore((s) => s.hoveredPartId);
  const setSelectedPartId = useAssemblyStore((s) => s.setSelectedPartId);
  const setHoveredPartId  = useAssemblyStore((s) => s.setHoveredPartId);
  const setActiveTab      = useAssemblyStore((s) => s.setActiveTab);

  const parts = currentAssembly?.parts ?? [];

  const handleOpenManual = (id: string): void => {
    setSelectedPartId(id);
    setActiveTab('manual');
  };

  const handleSelect = (id: string): void => {
    setSelectedPartId(selectedPartId === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Lista de Materiales (eBOM)
          </h2>
          {currentAssembly && (
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate max-w-[220px]">
              {currentAssembly.name}
            </p>
          )}
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
          {parts.length} componentes
        </span>
      </div>

      {/* Empty state */}
      {parts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-zinc-600" />
          <p className="text-xs font-medium">No hay piezas cargadas para este subsistema.</p>
        </div>
      )}

      {/* Scrollable table body */}
      {parts.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <table className="w-full border-collapse text-left table-fixed">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-2 text-center w-12">
                  <Hash className="w-3 h-3 inline" />
                </th>
                <th className="py-2.5 px-2.5 w-36">Código OEM</th>
                <th className="py-2.5 px-2.5">Denominación</th>
                <th className="py-2.5 px-2.5 w-24">Torque</th>
                <th className="py-2.5 px-2 text-center w-20">Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {parts.map((part, i) => (
                <PartRow
                  key={part.id}
                  part={part}
                  position={i + 1}
                  isSelected={selectedPartId === part.id}
                  isHovered={hoveredPartId === part.id}
                  onSelect={handleSelect}
                  onHover={setHoveredPartId}
                  onOpenManual={handleOpenManual}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {parts.length > 0 && (
        <div className="shrink-0 px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 bg-zinc-950/40">
          <span className="truncate">Clic en fila para seleccionar · Clic en modelo 3D para aislar</span>
          {selectedPartId && (
            <button
              onClick={() => setSelectedPartId(null)}
              className="text-blue-400 hover:text-blue-300 font-medium transition ml-2 shrink-0"
            >
              Limpiar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
};
