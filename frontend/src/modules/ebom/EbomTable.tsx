import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { Layers, Wrench, BookOpen, Tag } from 'lucide-react';
import clsx from 'clsx';

export const EbomTable: React.FC = () => {
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const selectedPartId = useAssemblyStore((s) => s.selectedPartId);
  const hoveredPartId = useAssemblyStore((s) => s.hoveredPartId);
  const setSelectedPartId = useAssemblyStore((s) => s.setSelectedPartId);
  const setHoveredPartId = useAssemblyStore((s) => s.setHoveredPartId);
  const setActiveTab = useAssemblyStore((s) => s.setActiveTab);

  const partsList = currentAssembly?.parts ?? [];

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
              Engineering BOM (eBOM)
            </h2>
            {currentAssembly && (
              <p className="text-[11px] text-slate-400">{currentAssembly.name}</p>
            )}
          </div>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
          {partsList.length} items
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-950/90 backdrop-blur z-10 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-4">OEM Code</th>
              <th className="py-2.5 px-4">Description</th>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4">Torque</th>
              <th className="py-2.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {partsList.map((part) => {
              const isSelected = selectedPartId === part.id;
              const isHovered = hoveredPartId === part.id;

              return (
                <tr
                  key={part.id}
                  onClick={() => setSelectedPartId(isSelected ? null : part.id)}
                  onMouseEnter={() => setHoveredPartId(part.id)}
                  onMouseLeave={() => setHoveredPartId(null)}
                  className={clsx(
                    'cursor-pointer transition-colors duration-150',
                    isSelected
                      ? 'bg-blue-600/20 border-l-4 border-l-blue-500 text-blue-100'
                      : isHovered
                      ? 'bg-slate-800/60 text-slate-200'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  )}
                >
                  <td className="py-2.5 px-4 font-mono font-medium text-blue-400">
                    {part.oem_code}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-slate-200">{part.name}</div>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">
                    {part.category ? (
                      <span className="inline-flex items-center gap-1 text-slate-300 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {part.category}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">
                    {part.torque_spec ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                        <Wrench className="w-3 h-3" />
                        {part.torque_spec}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {part.manual_page ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPartId(part.id);
                          setActiveTab('manual');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
                        title={`View manual page ${part.manual_page}`}
                      >
                        <BookOpen className="w-3 h-3 text-amber-400" />
                        p.{part.manual_page}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
