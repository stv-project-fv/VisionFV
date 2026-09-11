import { create } from 'zustand';
import type {
  ActiveTab,
  AppView,
  AssemblyDetail,
  NavigationTreeNode,
  PartEntity,
  VehicleCategory,
  VehicleDetail,
  VehicleEntity,
} from '@/types';
import { api } from '@/services/api';

interface AssemblyState {
  // ── App view (legacy, kept for Header compat) ────────────────────────────────
  appView: AppView;

  // ── Fleet state ─────────────────────────────────────────────────────────────
  vehicles: VehicleEntity[];
  selectedVehicle: VehicleDetail | null;
  vehicleCategoryFilter: VehicleCategory | null;
  searchQuery: string;
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

  // ── Tree navigation state ────────────────────────────────────────────────────
  expandedNodeIds: string[];
  selectedNodeId: string | null;

  // ── Fleet actions ────────────────────────────────────────────────────────────
  fetchVehicles: (category?: VehicleCategory) => Promise<void>;
  fetchVehicleDetail: (id: string) => Promise<void>;
  setVehicleCategoryFilter: (cat: VehicleCategory | null) => void;
  setSearchQuery: (query: string) => void;
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

  // ── Tree navigation actions ──────────────────────────────────────────────────
  toggleNode: (nodeId: string) => void;
  selectNode: (node: NavigationTreeNode) => Promise<void>;
}

export const useAssemblyStore = create<AssemblyState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  appView: 'workspace',

  vehicles: [],
  selectedVehicle: null,
  vehicleCategoryFilter: null,
  searchQuery: '',
  isLoadingVehicles: false,
  vehiclesError: null,

  currentAssembly: null,
  selectedPartId: null,
  hoveredPartId: null,
  explosionFactor: 0,
  activeTab: 'split',
  isLoading: false,
  error: null,

  expandedNodeIds: [],
  selectedNodeId: null,

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

  setVehicleCategoryFilter: (cat) => {
    const { selectedVehicle } = get();
    if (cat !== null && selectedVehicle && selectedVehicle.category !== cat) {
      set({
        vehicleCategoryFilter: cat,
        selectedVehicle: null,
        currentAssembly: null,
        selectedPartId: null,
      });
    } else {
      set({ vehicleCategoryFilter: cat });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

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

  // ── Tree navigation actions ────────────────────────────────────────────────

  toggleNode: (nodeId: string) => {
    const { expandedNodeIds } = get();
    const isExpanded = expandedNodeIds.includes(nodeId);
    set({
      expandedNodeIds: isExpanded
        ? expandedNodeIds.filter((id) => id !== nodeId)
        : [...expandedNodeIds, nodeId],
    });
  },

  selectNode: async (node: NavigationTreeNode) => {
    set({ selectedNodeId: node.id });

    switch (node.type) {
      case 'category':
        // Just toggle expand/collapse
        get().toggleNode(node.id);
        break;

      case 'vehicle': {
        if (!node.vehicleId) break;
        // Expand this node and fetch vehicle detail
        const { expandedNodeIds } = get();
        if (!expandedNodeIds.includes(node.id)) {
          set({ expandedNodeIds: [...expandedNodeIds, node.id] });
        }
        await get().fetchVehicleDetail(node.vehicleId);
        break;
      }

      case 'subsystem': {
        if (!node.assemblyId) break;
        // Load the assembly and switch to 3D view
        set({ isLoading: true, error: null, activeTab: 'split' });
        try {
          const assembly = await api.getAssembly(node.assemblyId);
          set({
            currentAssembly: assembly,
            selectedPartId: null,
            hoveredPartId: null,
            isLoading: false,
            explosionFactor: 0,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : `Failed to load assembly ${node.assemblyId}`;
          set({ error: msg, isLoading: false });
        }
        break;
      }

      case 'manual':
        // Switch center panel to manual view; URL/page can be stored in node
        set({ activeTab: 'manual' });
        break;
    }
  },
}));
