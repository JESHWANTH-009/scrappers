import React, { useState, useEffect } from 'react';
import { CrawlJob, CrawlPage, Manifest, LogEntry } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { PageTreeView } from '../components/PageTreeView';
import { MarkdownPreviewModal } from '../components/MarkdownPreviewModal';
import {
  Globe,
  BookOpen,
  FolderTree,
  List,
  FileJson,
  Download,
  ArrowLeft,
  Terminal,
  Eye,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';

interface CrawlDetailPageProps {
  jobId: string;
  onBack: () => void;
  onOpenLive: (jobId: string) => void;
}

export const CrawlDetailPage: React.FC<CrawlDetailPageProps> = ({
  jobId,
  onBack,
  onOpenLive,
}) => {
  const [job, setJob] = useState<CrawlJob | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [pages, setPages] = useState<CrawlPage[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'pages' | 'logs'>('hierarchy');

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewPath, setPreviewPath] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [jobData, pagesData, logsData] = await Promise.all([
          api.getJob(jobId),
          api.getJobPages(jobId),
          api.getJobLogs(jobId),
        ]);
        setJob(jobData);
        setPages(pagesData);
        setLogs(logsData);

        // Fetch manifest if available
        try {
          const manifestData = await api.getManifest(jobId);
          setManifest(manifestData);
        } catch {
          // Manifest may still be generating
        }
      } catch (err) {
        console.error('Failed to load crawl details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [jobId]);

  const handleOpenPageContent = async (page: CrawlPage) => {
    try {
      const data = await api.getPageContent(jobId, page.id);
      setPreviewTitle(data.title || page.url);
      setPreviewUrl(data.url);
      setPreviewPath(data.file_path);
      setPreviewContent(data.content);
      setPreviewOpen(true);
    } catch (err: any) {
      alert(`Could not load page content: ${err.message}`);
    }
  };

  const isWiki = job?.mode === 'wikipedia';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top back button & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Crawl History</span>
        </button>

        <div className="flex items-center gap-2">
          {job?.status === 'running' && (
            <button
              onClick={() => onOpenLive(jobId)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-colors"
            >
              <span>View Live Monitor</span>
            </button>
          )}

          <a
            href={api.getZipDownloadUrl(jobId)}
            download
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download ZIP</span>
          </a>
        </div>
      </div>

      {/* Overview Card */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl border shrink-0 ${
                isWiki
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              {isWiki ? <BookOpen className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {job?.target}
                </h2>
                {job && <StatusBadge status={job.status} />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="font-mono text-slate-500">ID: {jobId}</span>
                <span>•</span>
                <span className="capitalize">{job?.mode} Ingestion</span>
                <span>•</span>
                <span>Created: {job?.created_at ? new Date(job.created_at).toLocaleString() : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Total Discovered</span>
            <span className="text-lg font-bold text-white">{job?.pages_discovered || 0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Successfully Scraped</span>
            <span className="text-lg font-bold text-emerald-400">{job?.pages_scraped || 0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Failed Pages</span>
            <span className="text-lg font-bold text-rose-400">{job?.pages_failed || 0}</span>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block">Markdown Files</span>
            <span className="text-lg font-bold text-indigo-400">{job?.markdown_files_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'hierarchy'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          <span>Crawl Hierarchy Tree</span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'pages'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <List className="w-4 h-4" />
          <span>All Discovered Pages ({pages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Activity Logs ({logs.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'hierarchy' ? (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white">Parent-Child Page Structure</h3>
            <span className="text-xs text-slate-500">
              Preserved in <code className="text-indigo-400">manifest.json</code>
            </span>
          </div>
          {manifest?.hierarchy?.roots ? (
            <PageTreeView
              roots={manifest.hierarchy.roots}
              onSelectPage={(node) => {
                const page = pages.find((p) => p.url === node.url);
                if (page) handleOpenPageContent(page);
              }}
            />
          ) : (
            <div className="py-12 text-center text-slate-500 text-sm">
              Manifest hierarchy is generating or not yet written.
            </div>
          )}
        </div>
      ) : activeTab === 'pages' ? (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Title & Source URL</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">HTTP</th>
                  <th className="px-6 py-4">Depth</th>
                  <th className="px-6 py-4">Markdown File</th>
                  <th className="px-6 py-4 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                {pages.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3.5 max-w-md">
                      <span className="font-semibold text-white truncate block">
                        {p.title || p.url}
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-slate-400 hover:text-indigo-300 truncate block font-mono"
                      >
                        {p.url}
                      </a>
                    </td>

                    <td className="px-6 py-3.5">
                      <StatusBadge status={p.status} size="sm" />
                    </td>

                    <td className="px-6 py-3.5 font-mono">
                      {p.http_status ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.http_status === 200
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {p.http_status}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 font-mono text-slate-400">
                      {p.depth}
                    </td>

                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                      {p.file_path || <span className="text-slate-600">None</span>}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      {p.file_path && (
                        <button
                          onClick={() => handleOpenPageContent(p)}
                          className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors"
                          title="Preview Markdown"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 p-4 font-mono text-xs space-y-2 max-h-[500px] overflow-y-auto bg-[#070b14]">
          {logs.map((l, i) => (
            <div key={i} className="flex items-start gap-2 leading-relaxed">
              <span className="text-slate-600 select-none">
                [{new Date(l.timestamp).toLocaleTimeString()}]
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                  l.level === 'SUCCESS'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : l.level === 'ERROR'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    : l.level === 'WARN'
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                }`}
              >
                {l.level}
              </span>
              <span className="text-slate-300 break-all">{l.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Markdown Preview Modal */}
      <MarkdownPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={previewTitle}
        url={previewUrl}
        filePath={previewPath}
        content={previewContent}
      />
    </div>
  );
};
