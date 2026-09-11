import React, { useEffect, useRef } from 'react';
import { BookOpen, Wrench, Tag, AlertCircle, X } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import clsx from 'clsx';
import type { PartEntity } from '@/types';

// ─── Part Card Row ─────────────────────────────────────────────────────────────
// Vertical card layout: no table-fixed, no horizontal overflow.
// Each row is a self-contained card with OEM code at top + name + badges below.

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
  const rowRef = useRef<HTMLDivElement>(null);

  // Bidirectional sync: auto-scroll when selection comes from 3D viewport
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <div
      ref={rowRef}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(part.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(part.id)}
      onMouseEnter={() => onHover(part.id)}
      onMouseLeave={() => onHover(null)}
      className={clsx(
        'group cursor-pointer select-none transition-colors duration-100',
        'border-b border-zinc-800/60 last:border-b-0',
        isSelected
          ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
          : isHovered
          ? 'bg-zinc-800/50 border-l-2 border-l-zinc-600'
          : 'hover:bg-zinc-800/30 border-l-2 border-l-transparent',
      )}
    >
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {/* Position badge */}
        <span
          className={clsx(
            'mt-0.5 shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold font-mono leading-none',
            isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200',
          )}
        >
          {position}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* OEM Code */}
          <p className="font-mono text-[11px] font-semibold text-blue-400 truncate leading-tight">
            {part.oem_code}
          </p>

          {/* Name */}
          <p
            className={clsx(
              'text-xs font-medium leading-snug mt-0.5',
              isSelected
                ? 'text-blue-100'
                : 'text-zinc-200 group-hover:text-white',
            )}
          >
            {part.name}
          </p>

          {/* Category tag */}
          {part.category && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
              <Tag className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{part.category}</span>
            </p>
          )}

          {/* Badges row: torque + manual page */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {part.torque_spec && (
              <span className="inline-flex items-center gap-1 border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-300">
                <Wrench className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                {part.torque_spec}
              </span>
            )}
            {part.manual_page != null && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenManual(part.id);
                }}
                title={`Abrir página ${part.manual_page} del manual`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/90 hover:bg-amber-500/20 border border-zinc-700/80 hover:border-amber-500/40 text-zinc-500 hover:text-amber-400 transition text-[10px] font-mono"
              >
                <BookOpen className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                pág. {part.manual_page}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PartsTable ────────────────────────────────────────────────────────────────

interface PartsTableProps {
  /** When true, the component renders without its own header (used inside LivePartsPanel). */
  headless?: boolean;
}

export const PartsTable: React.FC<PartsTableProps> = ({ headless = false }) => {
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Standalone header — hidden when used inside LivePartsPanel */}
      {!headless && (
        <div className="shrink-0 px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Lista de Materiales (eBOM)
            </h2>
            {currentAssembly && (
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                {currentAssembly.name}
              </p>
            )}
          </div>
          <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
            {parts.length}
          </span>
        </div>
      )}

      {/* Empty state */}
      {parts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 p-6 text-center">
          <AlertCircle className="w-7 h-7 text-zinc-600" />
          <p className="text-xs font-medium">No hay piezas cargadas.</p>
        </div>
      )}

      {/* Scrollable card list */}
      {parts.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
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
        </div>
      )}

      {/* Footer */}
      {parts.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 bg-zinc-950/60">
          <span className="truncate">Clic para seleccionar · 3D sincronizado</span>
          {selectedPartId && (
            <button
              type="button"
              onClick={() => setSelectedPartId(null)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium transition ml-2 shrink-0"
            >
              <X className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
