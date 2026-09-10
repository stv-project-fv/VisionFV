import React from 'react';
import { Box, Sparkles, Layers, BookOpen, Columns } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import clsx from 'clsx';
import type { ActiveTab } from '@/types';

export const Header: React.FC = () => {
  const activeTab = useAssemblyStore((s) => s.activeTab);
  const setActiveTab = useAssemblyStore((s) => s.setActiveTab);
  const currentAssembly = useAssemblyStore((s) => s.currentAssembly);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'split', label: 'Split View', icon: Columns },
    { id: '3d', label: '3D Viewport', icon: Layers },
    { id: 'manual', label: 'Service Manual', icon: BookOpen },
  ];

  return (
    <header className="h-16 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-100 tracking-tight">
              VISION3DPARTS
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
              v1.0 Pro
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {currentAssembly ? currentAssembly.name : '3D Interactive Parts Catalog & eBOM Suite'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="font-medium">Backend Connected</span>
        </div>
      </div>
    </header>
  );
};
