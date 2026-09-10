import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { Sparkles, RotateCcw, Box, Eye } from 'lucide-react';

export const Toolbar: React.FC = () => {
  const explosionFactor = useAssemblyStore((s) => s.explosionFactor);
  const setExplosionFactor = useAssemblyStore((s) => s.setExplosionFactor);
  const resetSelection = useAssemblyStore((s) => s.resetSelection);
  const getSelectedPart = useAssemblyStore((s) => s.getSelectedPart);

  const selectedPart = getSelectedPart();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
      {/* Explosion Control */}
      <div className="flex items-center gap-4 flex-1 min-w-[280px] max-w-md">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Explode View:</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={explosionFactor}
          onChange={(e) => setExplosionFactor(parseFloat(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
        />
        <span className="font-mono text-xs text-blue-400 font-bold w-12 text-right">
          {Math.round(explosionFactor * 100)}%
        </span>
      </div>

      {/* Selected part info banner */}
      <div className="flex items-center gap-3">
        {selectedPart ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-slate-300">Selected:</span>
            <span className="font-semibold text-blue-300">{selectedPart.name}</span>
            <span className="font-mono text-slate-400">({selectedPart.oem_code})</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Box className="w-4 h-4 text-slate-400" />
            <span>Click any 3D component to inspect &amp; cross-reference</span>
          </div>
        )}

        <button
          onClick={resetSelection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset View
        </button>
      </div>
    </div>
  );
};
