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
        'cursor-pointer transition-colors duration-100 group',
        isSelected
          ? 'bg-blue-600/20 border-l-[3px] border-l-blue-500'
          : isHovered
          ? 'bg-slate-800/50'
          : 'hover:bg-slate-800/30'
      )}
    >
      {/* Position */}
      <td className="py-2.5 px-3 text-center">
        <span
          className={clsx(
            'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold font-mono',
            isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
          )}
        >
          {position}
        </span>
      </td>

      {/* OEM Code */}
      <td className="py-2.5 px-3">
        <span className="font-mono text-xs font-semibold text-blue-400">
          {part.oem_code}
        </span>
      </td>

      {/* Name + category */}
      <td className="py-2.5 px-3 max-w-[200px]">
        <p
          className={clsx(
            'text-xs font-medium leading-tight',
            isSelected ? 'text-blue-100' : 'text-slate-200'
          )}
        >
          {part.name}
        </p>
        {part.category && (
          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />
            {part.category}
          </p>
        )}
      </td>

      {/* Torque */}
      <td className="py-2.5 px-3">
        {part.torque_spec ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <Wrench className="w-2.5 h-2.5" />
            {part.torque_spec}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
        )}
      </td>

      {/* Action */}
      <td className="py-2.5 px-3 text-center">
        {part.manual_page != null ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenManual(part.id);
            }}
            title={`Open manual page ${part.manual_page}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500/40 border border-slate-700 text-slate-400 hover:text-amber-400 transition text-[10px] font-mono"
          >
            <BookOpen className="w-3 h-3" />
            p.{part.manual_page}
          </button>
        ) : (
          <span className="text-slate-600 text-xs">—</span>
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
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-100">
            Engineering BOM (eBOM)
          </h2>
          {currentAssembly && (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
              {currentAssembly.name}
            </p>
          )}
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {parts.length} items
        </span>
      </div>

      {/* Empty state */}
      {parts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-600">
          <AlertCircle className="w-8 h-8 text-slate-700" />
          <p className="text-xs">No parts loaded.</p>
        </div>
      )}

      {/* Scrollable table */}
      {parts.length > 0 && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur text-[10px] uppercase tracking-widest text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="py-2 px-3 text-center w-8">
                  <Hash className="w-3 h-3 inline" />
                </th>
                <th className="py-2 px-3">OEM Code</th>
                <th className="py-2 px-3">Denomination</th>
                <th className="py-2 px-3">Torque</th>
                <th className="py-2 px-3 text-center">Manual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
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
        <div className="shrink-0 px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-600">
          <span>Click row to select · Click 3D model to highlight</span>
          {selectedPartId && (
            <button
              onClick={() => setSelectedPartId(null)}
              className="text-blue-400 hover:text-blue-300 transition"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
};
