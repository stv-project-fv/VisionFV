import React from 'react';
import clsx from 'clsx';
import { Calendar, Hash, ArrowRight } from 'lucide-react';
import type { VehicleEntity } from '@/types';
import { getVehicleCategoryIcon } from './categoryIcons';

interface VehicleCardProps {
  vehicle: VehicleEntity;
  isSelected: boolean;
  onSelect: (vehicle: VehicleEntity) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(vehicle)}
      className={clsx(
        'group w-full text-left rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between gap-3 relative',
        isSelected
          ? 'ring-2 ring-blue-500 bg-zinc-800/80 shadow-lg shadow-blue-500/10 border-blue-500/50'
          : 'border-zinc-800/90 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-800/60 hover:shadow-md'
      )}
    >
      {/* Top row: Icon + Category Badge */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={clsx(
            'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
              : 'bg-zinc-800 border border-zinc-700/60 text-zinc-300 group-hover:text-blue-400 group-hover:border-blue-500/30'
          )}
        >
          {getVehicleCategoryIcon(vehicle.category, 'w-4.5 h-4.5')}
        </div>
        <span
          className={clsx(
            'shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border',
            isSelected
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              : 'bg-zinc-800/90 text-zinc-400 border-zinc-700/70'
          )}
        >
          {vehicle.category}
        </span>
      </div>

      {/* Center: Brand + Model */}
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider truncate">
          {vehicle.brand}
        </p>
        <h3
          className={clsx(
            'text-sm font-bold leading-snug mt-0.5 truncate',
            isSelected ? 'text-blue-100' : 'text-zinc-100 group-hover:text-white'
          )}
        >
          {vehicle.model}
        </h3>
      </div>

      {/* Footer: Internal code + Year + Selected prompt */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 font-semibold text-zinc-300">
            <Hash className="w-3 h-3 text-zinc-500" />
            {vehicle.internal_code}
          </span>
          {vehicle.year && (
            <span className="flex items-center gap-1 text-zinc-400">
              <Calendar className="w-3 h-3 text-zinc-500" />
              {vehicle.year}
            </span>
          )}
        </div>

        {isSelected ? (
          <div className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-sans">Subsistemas</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        ) : (
          <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 font-sans transition-colors">
            Ver subsistemas
          </span>
        )}
      </div>
    </button>
  );
};
