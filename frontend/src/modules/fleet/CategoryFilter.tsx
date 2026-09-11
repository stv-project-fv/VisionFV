import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Layers } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { VEHICLE_CATEGORIES } from '@/types';
import type { VehicleCategory } from '@/types';
import { getVehicleCategoryIcon } from './categoryIcons';
import clsx from 'clsx';

interface CategoryFilterProps {
  presentCategories?: VehicleCategory[];
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ presentCategories }) => {
  const vehicleCategoryFilter = useAssemblyStore((s) => s.vehicleCategoryFilter);
  const setVehicleCategoryFilter = useAssemblyStore((s) => s.setVehicleCategoryFilter);
  const searchQuery = useAssemblyStore((s) => s.searchQuery);
  const setSearchQuery = useAssemblyStore((s) => s.setSearchQuery);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftMask, setShowLeftMask] = useState(false);
  const [showRightMask, setShowRightMask] = useState(true);

  // Scroll masks handler
  const handleScroll = (): void => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeftMask(el.scrollLeft > 10);
    setShowRightMask(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    handleScroll();
  }, [presentCategories]);

  const categoriesToShow = presentCategories && presentCategories.length > 0
    ? VEHICLE_CATEGORIES.filter((c) => presentCategories.includes(c))
    : VEHICLE_CATEGORIES;

  return (
    <div className="flex flex-col gap-3 shrink-0 pb-3">
      {/* Search Bar Input */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por modelo, marca o código #..."
          className="w-full pl-10 pr-9 py-2 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
            title="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Category Pill List with Gradient Masks */}
      <div className="relative group">
        {/* Left gradient mask */}
        <div
          className={clsx(
            'pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10 transition-opacity duration-200',
            showLeftMask ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Scrollable pill container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex items-center gap-2 overflow-x-auto scroll-smooth py-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          {/* "Todas" pill */}
          <button
            onClick={() => setVehicleCategoryFilter(null)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0',
              vehicleCategoryFilter === null
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-1 ring-blue-500'
                : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todas</span>
          </button>

          {/* Category pills */}
          {categoriesToShow.map((cat) => {
            const isSelected = vehicleCategoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setVehicleCategoryFilter(cat)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-1 ring-blue-500'
                    : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
                )}
              >
                {getVehicleCategoryIcon(cat, 'w-3.5 h-3.5 shrink-0')}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Right gradient mask */}
        <div
          className={clsx(
            'pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-10 transition-opacity duration-200',
            showRightMask ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    </div>
  );
};
