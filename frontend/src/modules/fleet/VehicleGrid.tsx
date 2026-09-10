import React, { useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw, Truck } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { VehicleCard } from './VehicleCard';
import type { VehicleCategory, VehicleEntity } from '@/types';
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_ICONS } from '@/types';
import clsx from 'clsx';

// ── Filter tab ──────────────────────────────────────────────────────────────

const FilterTab: React.FC<{
  label: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={clsx(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
      active
        ? 'bg-blue-600 text-white shadow'
        : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800'
    )}
  >
    {icon && <span className="text-sm leading-none">{icon}</span>}
    {label}
  </button>
);

// ── VehicleGrid ──────────────────────────────────────────────────────────────

export const VehicleGrid: React.FC = () => {
  const vehicles            = useAssemblyStore((s) => s.vehicles);
  const selectedVehicle     = useAssemblyStore((s) => s.selectedVehicle);
  const vehicleCategoryFilter = useAssemblyStore((s) => s.vehicleCategoryFilter);
  const isLoadingVehicles   = useAssemblyStore((s) => s.isLoadingVehicles);
  const vehiclesError       = useAssemblyStore((s) => s.vehiclesError);
  const fetchVehicles       = useAssemblyStore((s) => s.fetchVehicles);
  const fetchVehicleDetail  = useAssemblyStore((s) => s.fetchVehicleDetail);
  const setVehicleCategoryFilter = useAssemblyStore((s) => s.setVehicleCategoryFilter);

  // Initial load
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSelect = (vehicle: VehicleEntity): void => {
    fetchVehicleDetail(vehicle.id);
  };

  const handleCategoryFilter = (cat: VehicleCategory | null): void => {
    setVehicleCategoryFilter(cat);
    fetchVehicles(cat ?? undefined);
  };

  // Categories present in current vehicle list (for dynamic filter)
  const presentCategories = [...new Set(vehicles.map((v) => v.category))].sort();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-1 pb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100">Fleet Catalog</h2>
          <p className="text-[11px] text-slate-500">
            {vehicles.length} unit{vehicles.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        {vehiclesError && (
          <button
            onClick={() => fetchVehicles()}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>

      {/* ── Category filter bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 pb-4 overflow-x-auto">
        <FilterTab
          label="All"
          active={vehicleCategoryFilter === null}
          onClick={() => handleCategoryFilter(null)}
        />
        {VEHICLE_CATEGORIES.filter((c) => presentCategories.includes(c)).map((cat) => (
          <FilterTab
            key={cat}
            label={cat}
            icon={VEHICLE_CATEGORY_ICONS[cat]}
            active={vehicleCategoryFilter === cat}
            onClick={() => handleCategoryFilter(cat)}
          />
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoadingVehicles ? (
          <div className="flex items-center justify-center h-full gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-sm">Loading fleet…</span>
          </div>
        ) : vehiclesError && vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-slate-400">Fleet data unavailable</p>
            <p className="text-xs text-slate-600">{vehiclesError}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <Truck className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-500">No vehicles found</p>
            <p className="text-xs text-slate-600">
              Start the backend and run <code className="font-mono text-slate-400">POST /api/v1/seed/fleet</code>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                isSelected={selectedVehicle?.id === vehicle.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
