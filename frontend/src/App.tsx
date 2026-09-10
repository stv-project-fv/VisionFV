import React from 'react';
import { Header } from '@/components/Header';
import { ViewportComponent } from '@/modules/viewer3d/ViewportComponent';
import { PartsTable } from '@/modules/ebom/PartsTable';
import { ManualDrawer } from '@/modules/manuals/ManualDrawer';
import { VehicleGrid } from '@/modules/fleet/VehicleGrid';
import { SubsystemSelector } from '@/modules/fleet/SubsystemSelector';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import {
  Loader2,
  AlertCircle,
  Layers,
  Box,
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronRight,
  Truck,
  ArrowLeft,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Status bar ───────────────────────────────────────────────────────────────

const StatusBar: React.FC = () => {
  const getSelectedPart = useAssemblyStore((s) => s.getSelectedPart);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const explosionFactor = useAssemblyStore((s) => s.explosionFactor);
  const selectedVehicle = useAssemblyStore((s) => s.selectedVehicle);
  const appView         = useAssemblyStore((s) => s.appView);
  const selected        = getSelectedPart();

  return (
    <div className="shrink-0 h-7 px-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-600 gap-6">
      <div className="flex items-center gap-4">
        <span>
          <span className="text-slate-500">View:</span>{' '}
          <span className="text-slate-400">{appView}</span>
        </span>
        {selectedVehicle && (
          <span>
            <span className="text-slate-500">Vehicle:</span>{' '}
            <span className="text-slate-400">{selectedVehicle.internal_code}</span>
          </span>
        )}
        {currentAssembly && (
          <span>
            <span className="text-slate-500">Assembly:</span>{' '}
            <span className="text-slate-400">{currentAssembly.id}</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {selected && (
          <span>
            <span className="text-slate-500">Part:</span>{' '}
            <span className="text-blue-400">{selected.oem_code}</span>
          </span>
        )}
        {appView === 'workspace' && (
          <>
            <span>
              <span className="text-slate-500">Explode:</span>{' '}
              <span className="text-blue-400">{Math.round(explosionFactor * 100)}%</span>
            </span>
            <span className="text-emerald-600">● WebGL</span>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

const Breadcrumb: React.FC = () => {
  const appView         = useAssemblyStore((s) => s.appView);
  const selectedVehicle = useAssemblyStore((s) => s.selectedVehicle);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const setAppView      = useAssemblyStore((s) => s.setAppView);

  if (appView === 'fleet') return null;

  return (
    <div className="shrink-0 px-4 pt-2 pb-0 flex items-center gap-1.5 text-[11px] text-slate-500">
      <button
        onClick={() => setAppView('fleet')}
        className="flex items-center gap-1 hover:text-slate-300 transition"
      >
        <Truck className="w-3.5 h-3.5" />
        Fleet
      </button>
      {selectedVehicle && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-700" />
          <span className="text-slate-400">
            {selectedVehicle.brand} {selectedVehicle.model}
          </span>
        </>
      )}
      {currentAssembly && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-700" />
          <span className="text-slate-200 font-medium">{currentAssembly.name}</span>
        </>
      )}
    </div>
  );
};

// ─── Workspace tab bar ────────────────────────────────────────────────────────

type WorkspaceTab = '3d' | 'split' | 'manual';

const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: React.ReactNode }[] = [
  { id: '3d',     label: '3D View', icon: <Box className="w-3.5 h-3.5" /> },
  { id: 'split',  label: 'Split',   icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'manual', label: 'Manual',  icon: <BookOpen className="w-3.5 h-3.5" /> },
];

// ─── Fleet View ───────────────────────────────────────────────────────────────

const FleetView: React.FC = () => (
  <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-4">
    <div className="min-h-0 h-full flex flex-col">
      <VehicleGrid />
    </div>
    <aside className="min-h-0 h-full flex flex-col">
      <SubsystemSelector />
    </aside>
  </div>
);

// ─── Workspace View ───────────────────────────────────────────────────────────

const WorkspaceView: React.FC = () => {
  const activeTab    = useAssemblyStore((s) => s.activeTab) as WorkspaceTab;
  const setActiveTab = useAssemblyStore((s) => s.setActiveTab);
  const isLoading    = useAssemblyStore((s) => s.isLoading);
  const error        = useAssemblyStore((s) => s.error);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);
  const setAppView   = useAssemblyStore((s) => s.setAppView);
  const [ebomOpen, setEbomOpen] = React.useState(true);

  return (
    <div className="h-full flex flex-col gap-0 min-h-0">
      {/* Toolbar row */}
      <div className="shrink-0 px-0 pb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Back to fleet */}
          <button
            onClick={() => setAppView('fleet')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Fleet
          </button>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {WORKSPACE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* eBOM toggle */}
        {activeTab !== 'manual' && (
          <button
            onClick={() => setEbomOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition text-xs"
          >
            {ebomOpen ? (
              <><PanelRightClose className="w-3.5 h-3.5" /> Hide eBOM</>
            ) : (
              <><PanelRightOpen className="w-3.5 h-3.5" /> Show eBOM</>
            )}
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && !currentAssembly && (
        <div className="shrink-0 mb-3 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isLoading && !currentAssembly ? (
          <div className="flex items-center justify-center h-full gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            <span className="text-sm">Loading assembly data…</span>
          </div>
        ) : (
          <>
            {/* 3D only */}
            {activeTab === '3d' && (
              <div className="h-full flex gap-4">
                <div className="flex-1 min-h-0 h-full">
                  <ViewportComponent />
                </div>
                {ebomOpen && (
                  <aside className="w-[320px] xl:w-[360px] min-h-0 h-full shrink-0">
                    <PartsTable />
                  </aside>
                )}
              </div>
            )}

            {/* Split */}
            {activeTab === 'split' && (
              <div
                className="h-full grid gap-4"
                style={{ gridTemplateColumns: ebomOpen ? '1fr 320px' : '1fr' }}
              >
                <div className="min-h-0 h-full">
                  <ViewportComponent />
                </div>
                {ebomOpen && (
                  <aside className="min-h-0 h-full flex flex-col">
                    <PartsTable />
                  </aside>
                )}
              </div>
            )}

            {/* Manual */}
            {activeTab === 'manual' && (
              <div className="h-full grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr] gap-4">
                <aside className="min-h-0 h-full flex flex-col">
                  <PartsTable />
                </aside>
                <div className="min-h-0 h-full flex flex-col">
                  <ManualDrawer />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── App ───────────────────────────────────────────────────────────────────────

export const App: React.FC = () => {
  const appView = useAssemblyStore((s) => s.appView);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Header />
      <Breadcrumb />

      <main className="flex-1 min-h-0 p-4 overflow-hidden">
        {appView === 'fleet' ? <FleetView /> : <WorkspaceView />}
      </main>

      <StatusBar />
    </div>
  );
};

export default App;
