import React, { useCallback, useRef, useState } from "react";
import { useAssemblyStore } from "@/store/useAssemblyStore";
import { api } from "@/services/api";
import type { DocumentType, ManualDocument } from "@/types";
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  Wrench,
} from "lucide-react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ManualUploadModalProps {
  onClose: () => void;
  onSuccess?: (manual: ManualDocument, partsExtracted: number) => void;
}

// ---------------------------------------------------------------------------
// ManualUploadModal
// ---------------------------------------------------------------------------

export const ManualUploadModal: React.FC<ManualUploadModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const vehicles        = useAssemblyStore((s) => s.vehicles);
  const selectedVehicle = useAssemblyStore((s) => s.selectedVehicle);
  const fetchVehicleManuals = useAssemblyStore((s) => s.fetchVehicleManuals);

  const [vehicleId, setVehicleId]   = useState(selectedVehicle?.id ?? "");
  const [docType, setDocType]       = useState<DocumentType>("PARTS_MANUAL");
  const [title, setTitle]           = useState("");
  const [file, setFile]             = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult]         = useState<{ manual: ManualDocument; partsExtracted: number } | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------------------------
  // Drag & drop
  // ---------------------------------------------------------------------------
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) {
      setFile(picked);
      if (!title) setTitle(picked.name.replace(/\.pdf$/i, ""));
    }
  };

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !vehicleId || !title) return;

      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("vehicle_id", vehicleId);
        formData.append("doc_type", docType);
        formData.append("title", title);

        const response = await api.uploadManual(formData);
        setResult({ manual: response.manual, partsExtracted: response.parts_extracted });

        // Refresh manual list for this vehicle
        await fetchVehicleManuals(vehicleId);

        onSuccess?.(response.manual, response.parts_extracted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al subir el archivo");
      } finally {
        setIsUploading(false);
      }
    },
    [file, vehicleId, docType, title, fetchVehicleManuals, onSuccess]
  );

  const canSubmit = !!file && !!vehicleId && !!title && !isUploading;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Cargar Manual PDF</h2>
              <p className="text-[11px] text-zinc-500">Ingesta de manual técnico y extracción eBOM</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition p-1 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Success result */}
          {result ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-100 mb-1">Manual cargado exitosamente</p>
                <p className="text-[12px] text-zinc-400">{result.manual.title}</p>
                <p className="text-[11px] text-zinc-500 mt-1">{result.manual.total_pages} páginas</p>
              </div>
              {result.partsExtracted > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">
                    {result.partsExtracted} repuestos extraídos al eBOM
                  </span>
                </div>
              )}
              {result.partsExtracted === 0 && docType === "PARTS_MANUAL" && (
                <p className="text-[11px] text-zinc-500">
                  No se detectaron tablas de repuestos en el PDF. Las piezas pueden ingresarse manualmente.
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition border border-zinc-700"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Drag & Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  "relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                  isDragging
                    ? "border-blue-500/60 bg-blue-500/5"
                    : file
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-zinc-700 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
                {file ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-zinc-200">{file.name}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-zinc-700/50 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-zinc-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-zinc-300">
                        {isDragging ? "Suelta el PDF aquí" : "Arrastrar PDF aquí"}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">o clic para seleccionar</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono border border-zinc-700 px-2 py-0.5 rounded">
                      .pdf únicamente
                    </span>
                  </>
                )}
              </div>

              {/* Vehicle selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Vehículo
                </label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/40"
                >
                  <option value="">— Seleccionar vehículo —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.internal_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Document type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Tipo de Documento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "PARTS_MANUAL", label: "Manual de Piezas", icon: FileText, hint: "Extrae eBOM automáticamente" },
                      { value: "OPERATION_MANUAL", label: "Manual de Uso", icon: BookOpen, hint: "Referencia de operación" },
                    ] as const
                  ).map(({ value, label, icon: Icon, hint }) => (
                    <label
                      key={value}
                      className={clsx(
                        "flex flex-col gap-1.5 p-3 rounded-xl border cursor-pointer transition-all",
                        docType === value
                          ? "border-blue-500/50 bg-blue-500/10"
                          : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600"
                      )}
                    >
                      <input
                        type="radio"
                        name="docType"
                        value={value}
                        checked={docType === value}
                        onChange={() => setDocType(value)}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <Icon className={clsx("w-4 h-4", docType === value ? "text-blue-400" : "text-zinc-500")} />
                        <span className={clsx("text-xs font-semibold", docType === value ? "text-blue-300" : "text-zinc-300")}>
                          {label}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 leading-snug">{hint}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Título del Documento
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Manual de Piezas Motor 6BT 5.9"
                  required
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/40"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={clsx(
                  "flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  canSubmit
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando PDF…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Cargar Manual</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
