import React, { useEffect, useState } from "react";
import { useAssemblyStore } from "@/store/useAssemblyStore";
import { PartsTable } from "./PartsTable";
import { ASSEMBLY_CATEGORY_ICONS } from "@/types";
import { PackageOpen, Layers, BookOpen, Plus, FileText, CheckCircle } from "lucide-react";
import { ManualUploadModal } from "@/modules/manuals/ManualUploadModal";
import clsx from "clsx";

// -- LivePartsPanel -----------------------------------------------------------
/**
 * Right-column panel. Renders assembly context header + headless PartsTable.
 * Bidirectional 3D<->row sync is handled inside PartsTable.
 * Now also hosts manual upload and manual list.
 */
export const LivePartsPanel: React.FC = () => {
  const currentAssembly    = useAssemblyStore((s) => s.currentAssembly);
  const selectedVehicle    = useAssemblyStore((s) => s.selectedVehicle);
  const vehicleManuals     = useAssemblyStore((s) => s.vehicleManuals);
  const activeManual       = useAssemblyStore((s) => s.activeManual);
  const fetchVehicleManuals = useAssemblyStore((s) => s.fetchVehicleManuals);
  const setActiveManual    = useAssemblyStore((s) => s.setActiveManual);
  const vehicles           = useAssemblyStore((s) => s.vehicles);

  const [showUploadModal, setShowUploadModal] = useState(false);

  // Fetch manuals when the selected vehicle changes
  useEffect(() => {
    if (selectedVehicle?.id) {
      void fetchVehicleManuals(selectedVehicle.id);
    }
  }, [selectedVehicle?.id, fetchVehicleManuals]);

  if (!currentAssembly) {
    return (
      <aside className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-zinc-800/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              eBOM en Vivo
            </h2>
          </div>
          {vehicles.length > 0 && (
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              title="Cargar manual PDF"
              className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700/60 hover:border-blue-500/30 transition"
            >
              <Plus className="w-3 h-3" />
              Manual
            </button>
          )}
        </div>

        {/* Empty state */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-5 py-8">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <PackageOpen className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 mb-1">Sin subsistema activo</p>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              Seleccione un subsistema en el explorador para ver su lista de materiales.
            </p>
          </div>
        </div>

        {/* Upload modal */}
        {showUploadModal && (
          <ManualUploadModal
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </aside>
    );
  }

  const categoryIcon = ASSEMBLY_CATEGORY_ICONS[currentAssembly.category] ?? "⚙️";

  return (
    <aside className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 overflow-hidden">
      {/* Assembly context header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-zinc-800/70 bg-zinc-900/40">
        {/* Top row: icon + label + part count badge + manual button */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm leading-none shrink-0" aria-hidden="true">
            {categoryIcon}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex-1 truncate">
            eBOM en Vivo
          </span>
          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
            {currentAssembly.parts.length} pzas.
          </span>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            title="Cargar manual PDF"
            className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-700/60 hover:border-blue-500/30 transition"
          >
            <Plus className="w-3 h-3" />
            Manual
          </button>
        </div>

        {/* Assembly name */}
        <p
          className="text-xs font-semibold text-zinc-100 truncate leading-tight"
          title={currentAssembly.name}
        >
          {currentAssembly.name}
        </p>

        {/* Manufacturer · code */}
        <p className="text-[10px] text-zinc-500 mt-0.5 font-mono truncate">
          {currentAssembly.manufacturer}
          <span className="text-zinc-700 mx-1">·</span>
          {currentAssembly.code}
        </p>
      </div>

      {/* Manuals list (if any) */}
      {vehicleManuals.length > 0 && (
        <div className="shrink-0 border-b border-zinc-800/70 bg-zinc-900/30 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-400" />
            Manuales ({vehicleManuals.length})
          </p>
          <div className="flex flex-col gap-1 max-h-28 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {vehicleManuals.map((manual) => {
              const isActive = activeManual?.id === manual.id;
              return (
                <button
                  key={manual.id}
                  type="button"
                  onClick={() => setActiveManual(isActive ? null : manual)}
                  className={clsx(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all",
                    isActive
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-zinc-800/40 border border-zinc-700/40 hover:border-zinc-600"
                  )}
                >
                  <FileText className={clsx("w-3 h-3 shrink-0", isActive ? "text-amber-400" : "text-zinc-500")} />
                  <span className={clsx("text-[11px] truncate flex-1", isActive ? "text-amber-200 font-semibold" : "text-zinc-300")}>
                    {manual.title}
                  </span>
                  {isActive && <CheckCircle className="w-3 h-3 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PartsTable in headless mode fills remaining height */}
      <div className="flex-1 min-h-0">
        <PartsTable headless />
      </div>

      {/* Upload modal */}
      {showUploadModal && (
        <ManualUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => setShowUploadModal(false)}
        />
      )}
    </aside>
  );
};
