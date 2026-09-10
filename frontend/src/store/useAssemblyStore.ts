import { create } from 'zustand';
import type {
  ActiveTab,
  AppView,
  AssemblyDetail,
  PartEntity,
  VehicleCategory,
  VehicleDetail,
  VehicleEntity,
} from '@/types';
import { api } from '@/services/api';

interface AssemblyState {
  // ── App view ────────────────────────────────────────────────────────────────
  appView: AppView;

  // ── Fleet state ─────────────────────────────────────────────────────────────
  vehicles: VehicleEntity[];
  selectedVehicle: VehicleDetail | null;
  vehicleCategoryFilter: VehicleCategory | null;
  isLoadingVehicles: boolean;
  vehiclesError: string | null;

  // ── Workspace state ─────────────────────────────────────────────────────────
  currentAssembly: AssemblyDetail | null;
  selectedPartId: string | null;
  hoveredPartId: string | null;
  explosionFactor: number;
  activeTab: ActiveTab;
  isLoading: boolean;
  error: string | null;

  // ── Fleet actions ────────────────────────────────────────────────────────────
  fetchVehicles: (category?: VehicleCategory) => Promise<void>;
  fetchVehicleDetail: (id: string) => Promise<void>;
  setVehicleCategoryFilter: (cat: VehicleCategory | null) => void;
  setSelectedVehicle: (vehicle: VehicleDetail | null) => void;

  // ── Workspace actions ────────────────────────────────────────────────────────
  fetchAssembly: (id: string) => Promise<void>;
  setCurrentAssembly: (assembly: AssemblyDetail | null) => void;
  setSelectedPartId: (id: string | null) => void;
  setHoveredPartId: (id: string | null) => void;
  setExplosionFactor: (factor: number) => void;
  setActiveTab: (tab: ActiveTab) => void;
  resetSelection: () => void;
  getSelectedPart: () => PartEntity | null;

  // ── Navigation ───────────────────────────────────────────────────────────────
  setAppView: (view: AppView) => void;
  openAssemblyWorkspace: (assemblyId: string) => Promise<void>;
}

export const useAssemblyStore = create<AssemblyState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  appView: 'fleet',

  vehicles: [],
  selectedVehicle: null,
  vehicleCategoryFilter: null,
  isLoadingVehicles: false,
  vehiclesError: null,

  currentAssembly: null,
  selectedPartId: null,
  hoveredPartId: null,
  explosionFactor: 0,
  activeTab: 'split',
  isLoading: false,
  error: null,

  // ── Fleet actions ──────────────────────────────────────────────────────────

  fetchVehicles: async (category?: VehicleCategory) => {
    set({ isLoadingVehicles: true, vehiclesError: null });
    try {
      const vehicles = await api.getVehicles(category);
      set({ vehicles, isLoadingVehicles: false });
    } catch (err) {
      set({
        vehiclesError: err instanceof Error ? err.message : 'Failed to load fleet',
        isLoadingVehicles: false,
      });
    }
  },

  fetchVehicleDetail: async (id: string) => {
    set({ isLoadingVehicles: true, vehiclesError: null });
    try {
      const vehicle = await api.getVehicle(id);
      set({ selectedVehicle: vehicle, isLoadingVehicles: false });
    } catch (err) {
      set({
        vehiclesError: err instanceof Error ? err.message : `Failed to load vehicle ${id}`,
        isLoadingVehicles: false,
      });
    }
  },

  setVehicleCategoryFilter: (cat) => set({ vehicleCategoryFilter: cat }),

  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),

  // ── Workspace actions ──────────────────────────────────────────────────────

  fetchAssembly: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const assembly = await api.getAssembly(id);
      set({ currentAssembly: assembly, selectedPartId: null, hoveredPartId: null, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to load assembly ${id}`;
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  setCurrentAssembly: (assembly) =>
    set({ currentAssembly: assembly, selectedPartId: null, hoveredPartId: null }),

  setSelectedPartId: (id) => set({ selectedPartId: id }),

  setHoveredPartId: (id) => set({ hoveredPartId: id }),

  setExplosionFactor: (factor) =>
    set({ explosionFactor: Math.max(0, Math.min(1, factor)) }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  resetSelection: () =>
    set({ selectedPartId: null, hoveredPartId: null, explosionFactor: 0 }),

  getSelectedPart: () => {
    const { currentAssembly, selectedPartId } = get();
    if (!currentAssembly || !selectedPartId) return null;
    return currentAssembly.parts.find((p) => p.id === selectedPartId) ?? null;
  },

  // ── Navigation ─────────────────────────────────────────────────────────────

  setAppView: (view) => set({ appView: view }),

  openAssemblyWorkspace: async (assemblyId: string) => {
    set({ isLoading: true, error: null, appView: 'workspace', activeTab: 'split' });
    try {
      const assembly = await api.getAssembly(assemblyId);
      set({ currentAssembly: assembly, selectedPartId: null, hoveredPartId: null, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to load assembly ${assemblyId}`;
      set({ error: msg, isLoading: false });
    }
  },
}));
