import React from 'react';
import { CrawlStats, CrawlJob } from '../types';
import { StatsCard } from '../components/StatsCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  Globe,
  BookOpen,
  FileText,
  Search,
  CheckCircle,
  Clock,
  ArrowRight,
  Download,
  Activity,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

interface DashboardPageProps {
  stats: CrawlStats | null;
  onNewScrapeClick: (mode?: 'url' | 'wikipedia') => void;
  onOpenJob: (jobId: string) => void;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  onNewScrapeClick,
  onOpenJob,
  onRefresh,
}) => {
  const recentJobs: CrawlJob[] = stats?.recent_jobs || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">RAG Ingestion Center</h2>
          <p className="text-sm text-slate-400 mt-1">
            Crawl web documentation and harvest Wikipedia knowledge bases into clean, structured Markdown for LLMs and Vector DBs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNewScrapeClick('url')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Globe className="w-4 h-4" />
            <span>Scrape Website</span>
          </button>
          <button
            onClick={() => onNewScrapeClick('wikipedia')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
          >
            <BookOpen className="w-4 h-4" />
            <span>Scrape Wikipedia</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Crawl Jobs"
          value={stats?.total_jobs ?? 0}
          subtitle={`${stats?.active_jobs ?? 0} active now`}
          icon={<Layers className="w-5 h-5" />}
          accent="indigo"
        />
        <StatsCard
          title="Pages Discovered"
          value={stats?.total_pages_discovered ?? 0}
          subtitle="Queued & indexed URLs"
          icon={<Search className="w-5 h-5" />}
          accent="cyan"
        />
        <StatsCard
          title="Pages Scraped"
          value={stats?.total_pages_scraped ?? 0}
          subtitle="Clean extracted content"
          icon={<CheckCircle className="w-5 h-5" />}
          accent="emerald"
        />
        <StatsCard
          title="Markdown Files"
          value={stats?.total_markdown_files ?? 0}
          subtitle="Ready for RAG embedding"
          icon={<FileText className="w-5 h-5" />}
          accent="amber"
        />
      </div>

      {/* Modes Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => onNewScrapeClick('url')}
          className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
              Scrape Using URL
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Target any documentation site or web portal. Recursively discovers links via Breadth-First Search, preserves source directory hierarchy, strips ads/boilerplates, and outputs clean UTF-8 Markdown with YAML front matter.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
            <span>Configure URL Crawl</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNewScrapeClick('wikipedia')}
          className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white group-hover:text-emerald-300 transition-colors">
              Scrape Using Keyword (Wikipedia)
            </h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Harness the official MediaWiki API to search encyclopedic topics across multilingual editions. Automatically extracts hierarchical sections, follows related article links, filters by relevance, and formats clean Markdown.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span>Configure Wikipedia Crawl</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Recent Crawl Jobs</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {recentJobs.length} most recent
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Mode</th>
                <th className="px-6 py-3.5">Target</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Scraped / Total</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No crawl jobs created yet. Click "Scrape Website" or "Scrape Wikipedia" to get started!
                  </td>
                </tr>
              ) : (
                recentJobs.map((job) => {
                  const isWiki = job.mode === 'wikipedia';
                  const timeStr = new Date(job.created_at).toLocaleString();
                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => onOpenJob(job.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-800 border border-slate-700">
                          {isWiki ? (
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                          <span className="capitalize">{job.mode}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 max-w-xs truncate">
                        <span className="text-white font-semibold truncate block">
                          {job.target}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {job.id}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={job.status} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-emerald-400 font-semibold">{job.pages_scraped}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-slate-400">{job.pages_discovered}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                        {timeStr}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
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
                            className="px-2.5 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors font-medium"
                          >
                            Details
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
