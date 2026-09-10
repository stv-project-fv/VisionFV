import React from 'react';
import clsx from 'clsx';
import { Calendar, Hash } from 'lucide-react';
import type { VehicleEntity } from '@/types';
import { VEHICLE_CATEGORY_ICONS } from '@/types';

interface VehicleCardProps {
  vehicle: VehicleEntity;
  isSelected: boolean;
  onSelect: (vehicle: VehicleEntity) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, isSelected, onSelect }) => {
  const icon = VEHICLE_CATEGORY_ICONS[vehicle.category] ?? '🔧';

  return (
    <button
      onClick={() => onSelect(vehicle)}
      className={clsx(
        'group w-full text-left rounded-xl border p-4 transition-all duration-150 flex flex-col gap-3',
        isSelected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30'
          : 'border-slate-800 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/70'
      )}
    >
      {/* Icon + Category */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-3xl leading-none" role="img" aria-label={vehicle.category}>
          {icon}
        </span>
        <span
          className={clsx(
            'shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border',
            isSelected
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          )}
        >
          {vehicle.category}
        </span>
      </div>

      {/* Brand + Model */}
      <div>
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
          {vehicle.brand}
        </p>
        <h3
          className={clsx(
            'text-sm font-bold leading-snug mt-0.5',
            isSelected ? 'text-blue-100' : 'text-slate-100'
          )}
        >
          {vehicle.model}
        </h3>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          {vehicle.internal_code}
        </span>
        {vehicle.year && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {vehicle.year}
          </span>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Select subsystem →
        </div>
      )}
    </button>
  );
};
