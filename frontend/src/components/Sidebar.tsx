import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  FolderTree,
  Settings,
  Database,
  Radio
} from 'lucide-react';

export type NavTab = 'dashboard' | 'new-scrape' | 'history' | 'files' | 'settings' | 'live-job';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeJobId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeJobId,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-scrape' as NavTab, label: 'New Scrape', icon: PlusCircle },
    { id: 'history' as NavTab, label: 'Crawl History', icon: History },
    { id: 'files' as NavTab, label: 'Markdown Files', icon: FolderTree },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#090d18] border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide">RAG Collector</h1>
          <p className="text-[10px] font-medium text-slate-400">Web & Wiki Ingestion</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-6 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Live Job shortcut button if active */}
        {activeJobId && (
          <div className="pt-4 mt-4 border-t border-slate-800/60">
            <span className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Job
            </span>
            <button
              onClick={() => onSelectTab('live-job')}
              className={`w-full mt-2 flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                currentTab === 'live-job'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span className="truncate">Live Monitor</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                LIVE
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span>Crawler Engine</span>
          <span className="text-emerald-400 font-medium">Async + BFS</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span>MediaWiki API</span>
          <span className="text-indigo-400 font-medium">Action API</span>
        </div>
        <div className="pt-2 text-[10px] text-slate-400 text-center">
          Production RAG Data Pipeline v1.0
        </div>
      </div>
    </aside>
  );
};
