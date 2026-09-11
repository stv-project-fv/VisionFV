// ── Explode vector ────────────────────────────────────────────────────────────

export type ExplodeVector = [number, number, number];

// ── Vehicle types ─────────────────────────────────────────────────────────────

export type VehicleCategory =
  | 'Aplanadoras'
  | 'Autoelevadores'
  | 'Bateas'
  | 'Camionetas'
  | 'Camiones Caja Cerrada'
  | 'Camiones Hidroelevadores'
  | 'Camiones Tractores'
  | 'Camiones Volcadores'
  | 'Carretones'
  | 'Desmalezadoras'
  | 'Chipeadoras'
  | 'Excavadoras'
  | 'Minicargadoras'
  | 'Motoniveladoras'
  | 'Palas Cargadoras'
  | 'Retroexcavadoras'
  | 'Terminadoras de Asfalto'
  | 'Tractores'
  | 'Otros';

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'Aplanadoras',
  'Autoelevadores',
  'Bateas',
  'Camionetas',
  'Camiones Caja Cerrada',
  'Camiones Hidroelevadores',
  'Camiones Tractores',
  'Camiones Volcadores',
  'Carretones',
  'Desmalezadoras',
  'Chipeadoras',
  'Excavadoras',
  'Minicargadoras',
  'Motoniveladoras',
  'Palas Cargadoras',
  'Retroexcavadoras',
  'Terminadoras de Asfalto',
  'Tractores',
  'Otros',
];

export interface VehicleEntity {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
  readonly category: VehicleCategory;
  readonly internal_code: string;
  readonly year: number | null;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface InstalledAssembly extends AssemblyEntity {
  readonly installed_position: string;
}

export interface VehicleDetail extends VehicleEntity {
  readonly assemblies: readonly InstalledAssembly[];
}

// ── Assembly types ────────────────────────────────────────────────────────────

export type AssemblyCategory =
  | 'Motor'
  | 'Transmisión'
  | 'Diferencial'
  | 'Hidráulico'
  | 'Chasis';

export interface AssemblyEntity {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly manufacturer: string;
  readonly category: AssemblyCategory;
  readonly model_glb_url?: string | null;
  readonly manual_pdf_url?: string | null;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export interface AssemblyDetail extends AssemblyEntity {
  readonly parts: readonly PartEntity[];
}

// ── Part types ────────────────────────────────────────────────────────────────

export interface PartEntity {
  readonly id: string;
  readonly assembly_id: string;
  readonly pos_number?: number | null;
  readonly oem_code: string;
  readonly name: string;
  readonly category?: string | null;
  readonly torque_spec?: string | null;
  readonly manual_page?: number | null;
  readonly explode_vector_x: number;
  readonly explode_vector_y: number;
  readonly explode_vector_z: number;
  readonly created_at?: string;
  readonly updated_at?: string;
}

// ── View types ────────────────────────────────────────────────────────────────

export type ActiveTab = '3d' | 'manual' | 'split';
export type ViewMode = 'orbit' | 'explode' | 'isolate' | 'section';
/** @deprecated Kept for backward compat; tree explorer replaces fleet/workspace toggle */
export type AppView = 'fleet' | 'workspace';

// ── Navigation tree ───────────────────────────────────────────────────────────

export interface NavigationTreeNode {
  readonly id: string;
  readonly label: string;
  readonly type: 'category' | 'vehicle' | 'subsystem' | 'manual';
  readonly vehicleId?: string;
  readonly assemblyId?: string;
  readonly manualUrl?: string;
  readonly manualPage?: number;
  readonly children?: NavigationTreeNode[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPartExplodeVector(part: PartEntity): ExplodeVector {
  return [part.explode_vector_x, part.explode_vector_y, part.explode_vector_z];
}

export const ASSEMBLY_CATEGORY_ICONS: Record<AssemblyCategory, string> = {
  Motor: '⚙️',
  Transmisión: '🔄',
  Diferencial: '⚡',
  Hidráulico: '💧',
  Chasis: '🔩',
};

export const VEHICLE_CATEGORY_ICONS: Record<VehicleCategory, string> = {
  Aplanadoras: '🛣️',
  Autoelevadores: '📦',
  Bateas: '🚛',
  Camionetas: '🚐',
  'Camiones Caja Cerrada': '🚚',
  'Camiones Hidroelevadores': '🏗️',
  'Camiones Tractores': '🚜',
  'Camiones Volcadores': '🚛',
  Carretones: '🚜',
  Desmalezadoras: '🌾',
  Chipeadoras: '🪵',
  Excavadoras: '🏗️',
  Minicargadoras: '🚜',
  Motoniveladoras: '🏗️',
  'Palas Cargadoras': '🪣',
  Retroexcavadoras: '⛏️',
  'Terminadoras de Asfalto': '🛣️',
  Tractores: '🚜',
  Otros: '🔧',
};
