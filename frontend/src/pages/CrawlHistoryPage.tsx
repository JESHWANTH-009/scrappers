import React, { useState, useEffect } from 'react';
import { CrawlJob } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  History,
  Search,
  Globe,
  BookOpen,
  Download,
  RotateCcw,
  ExternalLink,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface CrawlHistoryPageProps {
  onOpenJob: (jobId: string) => void;
  onRefreshTrigger?: number;
}

export const CrawlHistoryPage: React.FC<CrawlHistoryPageProps> = ({
  onOpenJob,
  onRefreshTrigger,
}) => {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await api.listJobs(100);
      setJobs(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [onRefreshTrigger]);

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (modeFilter !== 'all' && job.mode !== modeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTarget = job.target.toLowerCase().includes(q);
      const matchId = job.id.toLowerCase().includes(q);
      if (!matchTarget && !matchId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Crawl History</h2>
          <p className="text-sm text-slate-400 mt-1">
            Historical record of all website and Wikipedia harvesting jobs.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search URL, keyword, or job ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-500 transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2">
            Status:
          </span>
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'completed', label: 'Completed' },
            { id: 'running', label: 'Running' },
            { id: 'failed', label: 'Failed' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'interrupted', label: 'Interrupted' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Mode filter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2">
            Mode:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'url', label: 'Website' },
            { id: 'wikipedia', label: 'Wikipedia' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setModeFilter(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                modeFilter === item.id
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Job ID & Mode</th>
                <th className="px-6 py-4">Target Source</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Scraped / Total</th>
                <th className="px-6 py-4">Started</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Loading crawl history...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No crawl jobs match your active filters.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isWiki = job.mode === 'wikipedia';
                  const startTimeStr = job.started_at
                    ? new Date(job.started_at).toLocaleString()
                    : new Date(job.created_at).toLocaleString();

                  return (
                    <tr
                      key={job.id}
                      onClick={() => onOpenJob(job.id)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg border shrink-0 ${
                              isWiki
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}
                          >
                            {isWiki ? <BookOpen className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          </span>
                          <div>
                            <span className="font-mono text-xs font-semibold text-white block">
                              {job.id}
                            </span>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {job.mode} Crawl
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 max-w-sm truncate">
                        <span className="text-slate-200 font-semibold truncate block">
                          {job.target}
                        </span>
                        {job.error_message && (
                          <span className="text-[10px] text-rose-400 truncate block mt-0.5">
                            {job.error_message}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={job.status} />
                      </td>

                      <td className="px-6 py-4 font-mono">
                        <span className="text-emerald-400 font-bold">{job.pages_scraped}</span>
                        <span className="text-slate-600 mx-1">/</span>
                        <span className="text-slate-400">{job.pages_discovered}</span>
                        {job.pages_failed > 0 && (
                          <span className="text-[10px] text-rose-400 ml-2">
                            ({job.pages_failed} failed)
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                        {startTimeStr}
                      </td>

                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={api.getZipDownloadUrl(job.id)}
                            download
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Download ZIP"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => onOpenJob(job.id)}
                            className="px-3 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors font-medium"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
