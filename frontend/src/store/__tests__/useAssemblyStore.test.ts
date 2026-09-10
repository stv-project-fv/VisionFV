import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAssemblyStore } from '../useAssemblyStore';
import { api } from '@/services/api';
import type { AssemblyDetail, VehicleDetail, VehicleEntity } from '@/types';

vi.mock('@/services/api', () => ({
  api: {
    getVehicles: vi.fn(),
    getVehicle: vi.fn(),
    getAssemblies: vi.fn(),
    getAssembly: vi.fn(),
    getParts: vi.fn(),
    getPart: vi.fn(),
    seedFleet: vi.fn(),
  },
}));

const mockAssembly: AssemblyDetail = {
  id: 'ASM-CUMMINS-6BT',
  code: '6BT',
  name: 'Motor Diésel Cummins 6BT 5.9',
  manufacturer: 'Cummins',
  category: 'Motor',
  parts: [
    {
      id: 'P-6BT-001',
      assembly_id: 'ASM-CUMMINS-6BT',
      pos_number: 1,
      oem_code: 'CUM-3926872',
      name: 'Culata de Cilindros',
      category: 'Cylinder Head',
      torque_spec: '163 Nm',
      manual_page: 4,
      explode_vector_x: -2.0,
      explode_vector_y: 0.8,
      explode_vector_z: 0.0,
    },
    {
      id: 'P-6BT-002',
      assembly_id: 'ASM-CUMMINS-6BT',
      pos_number: 2,
      oem_code: 'CUM-3929049',
      name: 'Bloque de Motor',
      category: 'Block',
      torque_spec: null,
      manual_page: 5,
      explode_vector_x: 0.0,
      explode_vector_y: 0.0,
      explode_vector_z: 0.0,
    },
  ],
};

const mockVehicle: VehicleDetail = {
  id: 'VH-SINOMACH-722H',
  brand: 'Sinomach',
  model: '722H',
  category: 'Motoniveladoras',
  internal_code: 'MN-001',
  year: 2021,
  assemblies: [
    {
      id: 'ASM-CUMMINS-6BT',
      code: '6BT',
      name: 'Motor Diésel Cummins 6BT 5.9',
      manufacturer: 'Cummins',
      category: 'Motor',
      installed_position: 'Motor Principal',
    },
  ],
};

describe('useAssemblyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAssemblyStore.setState({
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
    });
  });

  describe('Part Selection & Explosion Factor', () => {
    it('sets and clears selected part ID', () => {
      const store = useAssemblyStore.getState();

      store.setSelectedPartId('P-6BT-001');
      expect(useAssemblyStore.getState().selectedPartId).toBe('P-6BT-001');

      store.setSelectedPartId(null);
      expect(useAssemblyStore.getState().selectedPartId).toBeNull();
    });

    it('sets and clears hovered part ID', () => {
      const store = useAssemblyStore.getState();

      store.setHoveredPartId('P-6BT-002');
      expect(useAssemblyStore.getState().hoveredPartId).toBe('P-6BT-002');

      store.setHoveredPartId(null);
      expect(useAssemblyStore.getState().hoveredPartId).toBeNull();
    });

    it('updates explosion factor slider and clamps value between 0 and 1', () => {
      const store = useAssemblyStore.getState();

      store.setExplosionFactor(0.75);
      expect(useAssemblyStore.getState().explosionFactor).toBe(0.75);

      // Clamp upper bound
      store.setExplosionFactor(1.5);
      expect(useAssemblyStore.getState().explosionFactor).toBe(1.0);

      // Clamp lower bound
      store.setExplosionFactor(-0.5);
      expect(useAssemblyStore.getState().explosionFactor).toBe(0.0);
    });

    it('retrieves the selected part entity from current assembly', () => {
      const store = useAssemblyStore.getState();
      store.setCurrentAssembly(mockAssembly);

      expect(useAssemblyStore.getState().getSelectedPart()).toBeNull();

      store.setSelectedPartId('P-6BT-001');
      const selected = useAssemblyStore.getState().getSelectedPart();
      expect(selected).not.toBeNull();
      expect(selected?.id).toBe('P-6BT-001');
      expect(selected?.oem_code).toBe('CUM-3926872');
      expect(selected?.torque_spec).toBe('163 Nm');

      store.setSelectedPartId('NON_EXISTENT');
      expect(useAssemblyStore.getState().getSelectedPart()).toBeNull();
    });

    it('resets selection and explosion factor to initial state', () => {
      const store = useAssemblyStore.getState();
      store.setCurrentAssembly(mockAssembly);
      store.setSelectedPartId('P-6BT-001');
      store.setHoveredPartId('P-6BT-002');
      store.setExplosionFactor(0.85);

      store.resetSelection();

      const state = useAssemblyStore.getState();
      expect(state.selectedPartId).toBeNull();
      expect(state.hoveredPartId).toBeNull();
      expect(state.explosionFactor).toBe(0);
      expect(state.currentAssembly).toEqual(mockAssembly); // Assembly is preserved
    });
  });

  describe('Fleet & View Mutations', () => {
    it('sets vehicle category filter and selected vehicle', () => {
      const store = useAssemblyStore.getState();

      store.setVehicleCategoryFilter('Motoniveladoras');
      expect(useAssemblyStore.getState().vehicleCategoryFilter).toBe('Motoniveladoras');

      store.setSelectedVehicle(mockVehicle);
      expect(useAssemblyStore.getState().selectedVehicle).toEqual(mockVehicle);

      store.setAppView('workspace');
      expect(useAssemblyStore.getState().appView).toBe('workspace');

      store.setActiveTab('3d');
      expect(useAssemblyStore.getState().activeTab).toBe('3d');
    });

    it('fetches vehicles and updates store state', async () => {
      const vehicles: VehicleEntity[] = [
        {
          id: 'VH-SINOMACH-722H',
          brand: 'Sinomach',
          model: '722H',
          category: 'Motoniveladoras',
          internal_code: 'MN-001',
          year: 2021,
        },
      ];
      vi.mocked(api.getVehicles).mockResolvedValueOnce(vehicles);

      await useAssemblyStore.getState().fetchVehicles('Motoniveladoras');

      const state = useAssemblyStore.getState();
      expect(state.isLoadingVehicles).toBe(false);
      expect(state.vehicles).toEqual(vehicles);
      expect(state.vehiclesError).toBeNull();
      expect(api.getVehicles).toHaveBeenCalledWith('Motoniveladoras');
    });

    it('handles vehicle fetch error gracefully', async () => {
      vi.mocked(api.getVehicles).mockRejectedValueOnce(new Error('Network Failure'));

      await useAssemblyStore.getState().fetchVehicles();

      const state = useAssemblyStore.getState();
      expect(state.isLoadingVehicles).toBe(false);
      expect(state.vehiclesError).toBe('Network Failure');
    });

    it('fetches vehicle detail and updates selectedVehicle', async () => {
      vi.mocked(api.getVehicle).mockResolvedValueOnce(mockVehicle);

      await useAssemblyStore.getState().fetchVehicleDetail('VH-SINOMACH-722H');

      const state = useAssemblyStore.getState();
      expect(state.isLoadingVehicles).toBe(false);
      expect(state.selectedVehicle).toEqual(mockVehicle);
      expect(state.vehiclesError).toBeNull();
    });

    it('fetches assembly detail and resets selection', async () => {
      vi.mocked(api.getAssembly).mockResolvedValueOnce(mockAssembly);

      const store = useAssemblyStore.getState();
      store.setSelectedPartId('OLD_PART');

      await store.fetchAssembly('ASM-CUMMINS-6BT');

      const state = useAssemblyStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.currentAssembly).toEqual(mockAssembly);
      expect(state.selectedPartId).toBeNull();
      expect(state.error).toBeNull();
    });

    it('opens assembly workspace transitioning view and tab', async () => {
      vi.mocked(api.getAssembly).mockResolvedValueOnce(mockAssembly);

      await useAssemblyStore.getState().openAssemblyWorkspace('ASM-CUMMINS-6BT');

      const state = useAssemblyStore.getState();
      expect(state.appView).toBe('workspace');
      expect(state.activeTab).toBe('split');
      expect(state.currentAssembly).toEqual(mockAssembly);
      expect(state.isLoading).toBe(false);
    });
  });
});
