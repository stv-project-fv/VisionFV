import type { AssemblyDetail, AssemblyEntity, PartEntity, VehicleCategory, VehicleDetail, VehicleEntity } from '@/types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });

    if (!response.ok) {
      let errorPayload: unknown;
      try { errorPayload = await response.json(); }
      catch { errorPayload = await response.text(); }
      throw new ApiError(
        `API request to ${endpoint} failed with status ${response.status}`,
        response.status,
        errorPayload
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : 'Network connection failed',
      0
    );
  }
}

export const api = {
  // ── Vehicles ────────────────────────────────────────────────────────────────

  async getVehicles(category?: VehicleCategory): Promise<VehicleEntity[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return request<VehicleEntity[]>(`/vehicles${query}`);
  },

  async getVehicle(id: string): Promise<VehicleDetail> {
    return request<VehicleDetail>(`/vehicles/${encodeURIComponent(id)}`);
  },

  // ── Assemblies ──────────────────────────────────────────────────────────────

  async getAssemblies(category?: string): Promise<AssemblyEntity[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return request<AssemblyEntity[]>(`/assemblies${query}`);
  },

  async getAssembly(id: string): Promise<AssemblyDetail> {
    return request<AssemblyDetail>(`/assemblies/${encodeURIComponent(id)}`);
  },

  // ── Parts ───────────────────────────────────────────────────────────────────

  async getParts(assemblyId?: string): Promise<PartEntity[]> {
    const query = assemblyId ? `?assembly_id=${encodeURIComponent(assemblyId)}` : '';
    return request<PartEntity[]>(`/parts${query}`);
  },

  async getPart(id: string): Promise<PartEntity> {
    return request<PartEntity>(`/parts/${encodeURIComponent(id)}`);
  },

  // ── Seed ────────────────────────────────────────────────────────────────────

  async seedFleet(): Promise<unknown> {
    return request('/seed/fleet', { method: 'POST' });
  },
};
