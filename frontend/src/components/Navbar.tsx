import React from 'react';
import { Plus, ExternalLink, RefreshCw } from 'lucide-react';

interface NavbarProps {
  onNewScrapeClick: () => void;
  onRefreshClick: () => void;
  isBackendHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewScrapeClick,
  onRefreshClick,
  isBackendHealthy,
}) => {
  return (
    <header className="h-16 px-8 border-b border-slate-800 bg-[#090d18]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-slate-100">
          RAG Data Collector Dashboard
        </h2>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
          FastAPI + React
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Backend health status badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendHealthy
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-slate-300">
            {isBackendHealthy ? 'Backend Connected' : 'Backend Offline'}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefreshClick}
          title="Refresh Data"
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* API Docs Swagger link */}
        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <span>Swagger Docs</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {/* Primary New Scrape Action */}
        <button
          onClick={onNewScrapeClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Scrape</span>
        </button>
      </div>
    </header>
  );
};
