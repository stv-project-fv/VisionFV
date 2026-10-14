import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAssemblyStore } from "@/store/useAssemblyStore";
import { api } from "@/services/api";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
  FileText,
} from "lucide-react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// pdfjs bootstrap
// ---------------------------------------------------------------------------

// Dynamic import to avoid issues at module-load time before vite processes the worker
type PdfjsLib = typeof import("pdfjs-dist");
let pdfjsLib: PdfjsLib | null = null;

async function getPdfjsLib(): Promise<PdfjsLib> {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist");
  // Use the bundled worker shim (no extra file needed with vite)
  lib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).href;
  pdfjsLib = lib;
  return lib;
}

// ---------------------------------------------------------------------------
// ManualViewer
// ---------------------------------------------------------------------------

interface ManualViewerProps {
  /** When true, render in a compact mode suitable for embedding in ManualDrawer */
  compact?: boolean;
}

export const ManualViewer: React.FC<ManualViewerProps> = ({ compact = false }) => {
  const activeManual   = useAssemblyStore((s) => s.activeManual);
  const currentPage    = useAssemblyStore((s) => s.currentPage);
  const setCurrentPage = useAssemblyStore((s) => s.setCurrentPage);

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [totalPages, setTotalPages]   = useState(0);
  const [scale, setScale]             = useState(1.2);
  const [isLoading, setIsLoading]     = useState(false);
  const [pageInput, setPageInput]     = useState(String(currentPage));
  const [error, setError]             = useState<string | null>(null);

  // Keep pdfDocument in a ref to avoid re-creating it on every page change
  const pdfDocRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const currentUrlRef = useRef<string>("");

  // ---------------------------------------------------------------------------
  // Load/reload the PDF when activeManual changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeManual) {
      pdfDocRef.current = null;
      setTotalPages(0);
      return;
    }

    const url = api.getManualFileUrl(activeManual.id);

    if (currentUrlRef.current === url && pdfDocRef.current) {
      // Same document, just re-render current page
      renderPage(currentPage);
      return;
    }

    let cancelled = false;
    currentUrlRef.current = url;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const lib = await getPdfjsLib();
        const loadingTask = lib.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        renderPage(1);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar el PDF");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeManual]);

  // ---------------------------------------------------------------------------
  // Re-render when currentPage changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(currentPage);
    }
    setPageInput(String(currentPage));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, scale]);

  const renderPage = useCallback(
    async (pageNum: number) => {
      const pdf = pdfDocRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;

      const clampedPage = Math.max(1, Math.min(pageNum, pdf.numPages));

      // Cancel any in-flight render
      renderTaskRef.current?.cancel();

      setIsLoading(true);
      try {
        const page = await pdf.getPage(clampedPage);
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width  = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        setIsLoading(false);
      } catch (err: unknown) {
        // "RenderingCancelledException" is expected when we cancel — ignore
        if (err instanceof Error && err.name === "RenderingCancelledException") return;
        setError(err instanceof Error ? err.message : "Error al renderizar la página");
        setIsLoading(false);
      }
    },
    [scale]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputCommit = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      setCurrentPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleZoomIn  = () => setScale((s) => Math.min(3, parseFloat((s + 0.2).toFixed(1))));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))));

  // ---------------------------------------------------------------------------
  // Empty state — no manual loaded
  // ---------------------------------------------------------------------------
  if (!activeManual) {
    return (
      <div className={clsx("flex flex-col items-center justify-center gap-4 text-center px-6", compact ? "h-48" : "h-full")}>
        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-zinc-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-300 mb-1">Sin manual activo</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Cargue un PDF de manual usando el botón <span className="text-zinc-400 font-mono">+ Manual</span> en el panel de piezas.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={clsx("flex flex-col bg-zinc-900 overflow-hidden", compact ? "h-full" : "h-full")}>
      {/* ── Header / Controls ───────────────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2 border-b border-zinc-800 bg-zinc-900/95 flex items-center justify-between gap-2">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-semibold text-zinc-200 truncate" title={activeManual.title}>
            {activeManual.title}
          </span>
        </div>

        {/* Page navigation + zoom */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            title="Reducir zoom"
            disabled={scale <= 0.4}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-zinc-500 w-8 text-center">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Aumentar zoom"
            disabled={scale >= 3}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-zinc-700 mx-1" />

          <button
            type="button"
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition"
            title="Página anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <input
            type="text"
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputCommit}
            onKeyDown={(e) => e.key === "Enter" && handlePageInputCommit()}
            className="w-9 text-center text-[11px] font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-200 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500/60"
            aria-label="Número de página"
          />
          <span className="text-[10px] text-zinc-500 font-mono">/ {totalPages || "—"}</span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition"
            title="Página siguiente"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto bg-zinc-950/70 flex items-start justify-center p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-xs text-zinc-300">Renderizando…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs max-w-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="shadow-2xl rounded border border-zinc-800 max-w-full"
          style={{ display: error ? "none" : "block" }}
        />
      </div>
    </div>
  );
};
