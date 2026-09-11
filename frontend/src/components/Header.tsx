import React from 'react';
import { Box, Sparkles, Search, X } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';

export const Header: React.FC = () => {
  const selectedVehicle = useAssemblyStore((s) => s.selectedVehicle);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const searchQuery     = useAssemblyStore((s) => s.searchQuery);
  const setSearchQuery  = useAssemblyStore((s) => s.setSearchQuery);

  // Dynamic subtitle based on current selection
  const headerSubtitle = React.useMemo(() => {
    if (selectedVehicle && currentAssembly) {
      return `${selectedVehicle.brand} ${selectedVehicle.model} — ${currentAssembly.name}`;
    }
    if (selectedVehicle) {
      return `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.internal_code})`;
    }
    return 'Catálogo Interactivo 3D & Suite eBOM';
  }, [selectedVehicle, currentAssembly]);

  return (
    <header className="h-14 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shadow-md shrink-0 gap-3">
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
          <Box className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-100 tracking-tight">
              VISION3DPARTS
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 truncate max-w-[260px]" title={headerSubtitle}>
            {headerSubtitle}
          </p>
        </div>
      </div>

      {/* Center: Search bar — always visible (used by TreeExplorer) */}
      <div className="flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar vehículo, modelo o código..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Connection badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium hidden md:inline">Backend Conectado</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </header>
  );
};
