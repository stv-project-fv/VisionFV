import React, { useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, RefreshCw, Truck } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { VehicleCard } from './VehicleCard';
import { CategoryFilter } from './CategoryFilter';
import type { VehicleCategory, VehicleEntity } from '@/types';

export const VehicleGrid: React.FC = () => {
  const vehicles = useAssemblyStore((s) => s.vehicles);
  const selectedVehicle = useAssemblyStore((s) => s.selectedVehicle);
  const vehicleCategoryFilter = useAssemblyStore((s) => s.vehicleCategoryFilter);
  const searchQuery = useAssemblyStore((s) => s.searchQuery);
  const isLoadingVehicles = useAssemblyStore((s) => s.isLoadingVehicles);
  const vehiclesError = useAssemblyStore((s) => s.vehiclesError);
  const fetchVehicles = useAssemblyStore((s) => s.fetchVehicles);
  const fetchVehicleDetail = useAssemblyStore((s) => s.fetchVehicleDetail);

  // Initial load
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSelect = (vehicle: VehicleEntity): void => {
    fetchVehicleDetail(vehicle.id);
  };

  // Extract categories present in current vehicle catalog
  const presentCategories = useMemo(() => {
    return [...new Set(vehicles.map((v) => v.category))].sort() as VehicleCategory[];
  }, [vehicles]);

  // Filter vehicles by category and text search query
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      // Category filter
      if (vehicleCategoryFilter && v.category !== vehicleCategoryFilter) {
        return false;
      }
      // Search query filter (matches model, brand, internal_code, category)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBrand = v.brand.toLowerCase().includes(q);
        const matchesModel = v.model.toLowerCase().includes(q);
        const matchesCode = v.internal_code.toLowerCase().includes(q);
        const matchesCat = v.category.toLowerCase().includes(q);
        if (!matchesBrand && !matchesModel && !matchesCode && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [vehicles, vehicleCategoryFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-1 pb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Catálogo de Flota</h2>
          <p className="text-[11px] text-zinc-400">
            {filteredVehicles.length} {filteredVehicles.length === 1 ? 'unidad disponible' : 'unidades disponibles'}
            {vehicles.length !== filteredVehicles.length && ` (${vehicles.length} total)`}
          </p>
        </div>

        {vehiclesError && (
          <button
            onClick={() => fetchVehicles()}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reintentar
          </button>
        )}
      </div>

      {/* ── Category & Search Filter Bar ────────────────────────────────────── */}
      <CategoryFilter presentCategories={presentCategories} />

      {/* ── Vehicle Cards Grid with Custom Scrollbar ────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {isLoadingVehicles ? (
          <div className="flex items-center justify-center h-full gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            <span className="text-sm">Cargando flota...</span>
          </div>
        ) : vehiclesError && vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-zinc-300">Datos de flota no disponibles</p>
            <p className="text-xs text-zinc-500">{vehiclesError}</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <Truck className="w-10 h-10 text-zinc-700" />
            <p className="text-sm text-zinc-400">No se encontraron vehículos</p>
            <p className="text-xs text-zinc-500">
              Pruebe cambiando los filtros o busque por otro término.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-2">
            {filteredVehicles.map((vehicle) => (
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
