import React, { useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  BookOpen,
  Settings2,
  ChevronRight,
  Loader2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import type { NavigationTreeNode, VehicleEntity } from '@/types';
import { ASSEMBLY_CATEGORY_ICONS, VEHICLE_CATEGORY_ICONS } from '@/types';
import clsx from 'clsx';

// ─── Build tree from vehicles ──────────────────────────────────────────────────

function buildTree(vehicles: VehicleEntity[]): NavigationTreeNode[] {
  const categoryMap = new Map<string, VehicleEntity[]>();

  for (const v of vehicles) {
    const cat = v.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(v);
  }

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, vList]) => ({
      id: `cat-${category}`,
      label: category,
      type: 'category' as const,
      children: vList
        .sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`))
        .map((v) => ({
          id: `vehicle-${v.id}`,
          label: `${v.brand} ${v.model}`,
          type: 'vehicle' as const,
          vehicleId: v.id,
          children: [], // populated dynamically from selectedVehicle
        })),
    }));
}

// ─── Level-3 Subsystem & Manual nodes ─────────────────────────────────────────

interface Level3RowProps {
  node: NavigationTreeNode;
  depth: number;
  isSelected: boolean;
  onSelect: (node: NavigationTreeNode) => void;
}

const Level3Row: React.FC<Level3RowProps> = ({ node, depth, isSelected, onSelect }) => {
  const isManual = node.type === 'manual';

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      title={node.label}
      className={clsx(
        'w-full flex items-center gap-2.5 text-left px-3 py-2 transition-all duration-100 group rounded-md',
        isSelected
          ? 'bg-blue-600/20 border-l-2 border-blue-500 text-blue-200'
          : 'hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border-l-2 border-transparent',
      )}
      style={{ paddingLeft: `${depth * 12 + 12}px` }}
    >
      {isManual ? (
        <BookOpen
          className={clsx('w-3.5 h-3.5 shrink-0', isSelected ? 'text-amber-400' : 'text-amber-500/70 group-hover:text-amber-400')}
        />
      ) : (
        <Settings2
          className={clsx('w-3.5 h-3.5 shrink-0', isSelected ? 'text-blue-400' : 'text-zinc-500 group-hover:text-blue-400')}
        />
      )}
      <span className="text-xs font-medium leading-tight truncate flex-1">{node.label}</span>
    </button>
  );
};

// ─── Level-2 Vehicle node ──────────────────────────────────────────────────────

interface VehicleNodeProps {
  node: NavigationTreeNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  level3Nodes: NavigationTreeNode[];
  selectedNodeId: string | null;
  isLoadingSubsystems: boolean;
  onToggle: (id: string) => void;
  onSelect: (node: NavigationTreeNode) => void;
}

const VehicleNode: React.FC<VehicleNodeProps> = ({
  node,
  depth,
  isExpanded,
  isSelected,
  level3Nodes,
  selectedNodeId,
  isLoadingSubsystems,
  onToggle: _onToggle,
  onSelect,
}) => {
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node)}
        title={node.label}
        className={clsx(
          'w-full flex items-center gap-2 text-left px-3 py-2 transition-all duration-100 group rounded-md',
          isSelected
            ? 'bg-blue-600/20 border-l-2 border-blue-500 text-blue-200'
            : 'hover:bg-zinc-800/50 text-zinc-300 hover:text-zinc-100 border-l-2 border-transparent',
        )}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {/* Chevron */}
        <ChevronRight
          className={clsx(
            'w-3 h-3 shrink-0 transition-transform duration-200',
            isExpanded ? 'rotate-90 text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400',
          )}
        />
        {/* Icon */}
        <span className="text-sm shrink-0">🚗</span>
        {/* Label */}
        <span className="text-xs font-semibold truncate flex-1">{node.label}</span>
        {/* Loading spinner for subsystems */}
        {isLoadingSubsystems && isExpanded && (
          <Loader2 className="w-3 h-3 shrink-0 animate-spin text-blue-400" />
        )}
      </button>

      {/* Children (level 3) */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: isExpanded ? `${level3Nodes.length * 48 + 8}px` : '0px' }}
      >
        {isExpanded && (
          <div className="py-0.5">
            {level3Nodes.map((child) => (
              <Level3Row
                key={child.id}
                node={child}
                depth={depth + 1}
                isSelected={selectedNodeId === child.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Level-1 Category node ─────────────────────────────────────────────────────

interface CategoryNodeProps {
  node: NavigationTreeNode;
  depth: number;
  isExpanded: boolean;
  selectedNodeId: string | null;
  expandedNodeIds: string[];
  activeVehicleId: string | null;
  isLoadingVehicleDetail: boolean;
  level3Nodes: NavigationTreeNode[];
  onToggle: (id: string) => void;
  onSelect: (node: NavigationTreeNode) => void;
}

const CategoryNode: React.FC<CategoryNodeProps> = ({
  node,
  depth,
  isExpanded,
  selectedNodeId,
  expandedNodeIds,
  activeVehicleId,
  isLoadingVehicleDetail,
  level3Nodes,
  onToggle,
  onSelect,
}) => {
  const categoryIcon = VEHICLE_CATEGORY_ICONS[node.label as keyof typeof VEHICLE_CATEGORY_ICONS] ?? '📁';

  return (
    <div>
      {/* Category header */}
      <button
        type="button"
        onClick={() => onSelect(node)}
        title={node.label}
        className={clsx(
          'w-full flex items-center gap-2.5 text-left px-3 py-2.5 transition-all duration-100 group rounded-lg',
          isExpanded
            ? 'text-zinc-100 bg-zinc-800/40'
            : 'text-zinc-300 hover:bg-zinc-800/30 hover:text-zinc-100',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight
          className={clsx(
            'w-3.5 h-3.5 shrink-0 transition-transform duration-200',
            isExpanded ? 'rotate-90 text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400',
          )}
        />
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 shrink-0 text-amber-400" />
        ) : (
          <Folder className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-amber-400 transition" />
        )}
        <span className="text-[11px] font-bold uppercase tracking-wider flex-1 truncate">
          {node.label}
        </span>
        <span className="text-sm shrink-0">{categoryIcon}</span>
        <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
          {node.children?.length ?? 0}
        </span>
      </button>

      {/* Vehicle children */}
      <div
        className="overflow-hidden transition-all duration-250"
        style={{
          maxHeight: isExpanded ? `${(node.children?.length ?? 0) * 400}px` : '0px',
        }}
      >
        {isExpanded && node.children && (
          <div className="py-0.5 pl-2 border-l border-zinc-800/60 ml-4">
            {node.children.map((vehicleNode) => {
              const vehicleIsExpanded = expandedNodeIds.includes(vehicleNode.id);
              const isActiveVehicle = vehicleNode.vehicleId === activeVehicleId;
              const vehicleSelected = selectedNodeId === vehicleNode.id;
              return (
                <VehicleNode
                  key={vehicleNode.id}
                  node={vehicleNode}
                  depth={depth + 1}
                  isExpanded={vehicleIsExpanded}
                  isSelected={vehicleSelected}
                  level3Nodes={isActiveVehicle ? level3Nodes : []}
                  selectedNodeId={selectedNodeId}
                  isLoadingSubsystems={isLoadingVehicleDetail}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── TreeExplorer ──────────────────────────────────────────────────────────────

export const TreeExplorer: React.FC = () => {
  const vehicles          = useAssemblyStore((s) => s.vehicles);
  const selectedVehicle   = useAssemblyStore((s) => s.selectedVehicle);
  const isLoadingVehicles = useAssemblyStore((s) => s.isLoadingVehicles);
  const isLoadingVehicleDetail = useAssemblyStore((s) => s.isLoadingVehicles);
  const vehiclesError     = useAssemblyStore((s) => s.vehiclesError);
  const searchQuery       = useAssemblyStore((s) => s.searchQuery);
  const setSearchQuery    = useAssemblyStore((s) => s.setSearchQuery);
  const expandedNodeIds   = useAssemblyStore((s) => s.expandedNodeIds);
  const selectedNodeId    = useAssemblyStore((s) => s.selectedNodeId);
  const fetchVehicles     = useAssemblyStore((s) => s.fetchVehicles);
  const toggleNode        = useAssemblyStore((s) => s.toggleNode);
  const selectNode        = useAssemblyStore((s) => s.selectNode);
  const currentAssembly   = useAssemblyStore((s) => s.currentAssembly);

  // Fetch all vehicles on mount
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Filter vehicles by search query
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase().trim();
    return vehicles.filter(
      (v) =>
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.internal_code.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q),
    );
  }, [vehicles, searchQuery]);

  // Build the hierarchical tree from filtered vehicles
  const tree = useMemo(() => buildTree(filteredVehicles), [filteredVehicles]);

  // Build level-3 nodes for the currently selected vehicle
  const level3Nodes = useMemo<NavigationTreeNode[]>(() => {
    if (!selectedVehicle) return [];
    const nodes: NavigationTreeNode[] = [];

    // Manual node (if any assembly has a PDF URL)
    const firstManualAssembly = selectedVehicle.assemblies.find((a) => a.manual_pdf_url);
    if (firstManualAssembly?.manual_pdf_url) {
      nodes.push({
        id: `manual-${selectedVehicle.id}`,
        label: 'Manual de Taller & Servicio (PDF)',
        type: 'manual',
        vehicleId: selectedVehicle.id,
        manualUrl: firstManualAssembly.manual_pdf_url,
      });
    }

    // Assembly / subsystem nodes
    for (const asm of selectedVehicle.assemblies) {
      const icon = ASSEMBLY_CATEGORY_ICONS[asm.category] ?? '⚙️';
      nodes.push({
        id: `subsystem-${asm.id}`,
        label: `${icon} ${asm.name} (${asm.manufacturer})`,
        type: 'subsystem',
        vehicleId: selectedVehicle.id,
        assemblyId: asm.id,
      });
    }

    return nodes;
  }, [selectedVehicle]);

  const handleSelect = (node: NavigationTreeNode): void => {
    void selectNode(node);
  };

  return (
    <aside className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-zinc-800/70">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Explorador
          </span>
          {isLoadingVehicles && (
            <Loader2 className="w-3 h-3 animate-spin text-blue-400 ml-auto" />
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/40 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tree Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 px-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {/* Error state */}
        {vehiclesError && vehicles.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <p className="text-xs text-zinc-400">Sin conexión al backend</p>
            <button
              type="button"
              onClick={() => fetchVehicles()}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty search */}
        {!vehiclesError && filteredVehicles.length === 0 && !isLoadingVehicles && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <Search className="w-5 h-5 text-zinc-600" />
            <p className="text-xs text-zinc-500">Sin resultados para "{searchQuery}"</p>
          </div>
        )}

        {/* Category tree nodes */}
        {tree.map((categoryNode) => (
          <CategoryNode
            key={categoryNode.id}
            node={categoryNode}
            depth={0}
            isExpanded={expandedNodeIds.includes(categoryNode.id)}
            selectedNodeId={selectedNodeId}
            expandedNodeIds={expandedNodeIds}
            activeVehicleId={selectedVehicle?.id ?? null}
            isLoadingVehicleDetail={isLoadingVehicleDetail}
            level3Nodes={level3Nodes}
            onToggle={toggleNode}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-3 py-2 border-t border-zinc-800/70 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
        <span>{vehicles.length} unidades</span>
        {currentAssembly && (
          <span className="truncate max-w-[100px] text-blue-500/70" title={currentAssembly.name}>
            {currentAssembly.name}
          </span>
        )}
      </div>
    </aside>
  );
};
