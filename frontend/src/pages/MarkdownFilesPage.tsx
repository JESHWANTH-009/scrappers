import React, { useState, useEffect } from 'react';
import { CrawlJob, CrawlPage } from '../types';
import { api } from '../services/api';
import { MarkdownPreviewModal } from '../components/MarkdownPreviewModal';
import {
  FolderTree,
  FileText,
  Search,
  Download,
  FileJson,
  Eye,
  Globe,
  BookOpen,
  Folder,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface MarkdownFilesPageProps {
  initialJobId?: string | null;
}

export const MarkdownFilesPage: React.FC<MarkdownFilesPageProps> = ({ initialJobId }) => {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '');
  const [pages, setPages] = useState<CrawlPage[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewPath, setPreviewPath] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('');

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const list = await api.listJobs(100);
        setJobs(list);
        if (!selectedJobId && list.length > 0) {
          setSelectedJobId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load jobs list:', err);
      }
    };
    loadJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;

    const loadPages = async () => {
      try {
        setLoading(true);
        const data = await api.getJobPages(selectedJobId);
        // Keep only completed pages that have a generated markdown file
        const completedWithFiles = data.filter(
          (p) => p.status === 'completed' && p.file_path
        );
        setPages(completedWithFiles);
      } catch (err) {
        console.error('Failed to load pages for job:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPages();
  }, [selectedJobId]);

  const handlePreview = async (page: CrawlPage) => {
    try {
      const data = await api.getPageContent(selectedJobId, page.id);
      setPreviewTitle(data.title || page.url);
      setPreviewUrl(data.url);
      setPreviewPath(data.file_path);
      setPreviewContent(data.content);
      setPreviewOpen(true);
    } catch (err: any) {
      alert(`Could not load page content: ${err.message}`);
    }
  };

  const handleDownloadSingle = async (page: CrawlPage) => {
    try {
      const data = await api.getPageContent(selectedJobId, page.id);
      const blob = new Blob([data.content], { type: 'text/markdown;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const filename = page.file_path ? page.file_path.split('/').pop() || 'document.md' : 'document.md';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(`Could not download file: ${err.message}`);
    }
  };

  const filteredPages = pages.filter((page) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (page.title || '').toLowerCase().includes(q);
    const urlMatch = page.url.toLowerCase().includes(q);
    const pathMatch = (page.file_path || '').toLowerCase().includes(q);
    return titleMatch || urlMatch || pathMatch;
  });

  const currentJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Job Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Markdown Files Browser</h2>
          <p className="text-sm text-slate-400 mt-1">
            Inspect, search, and download generated UTF-8 Markdown documents with YAML front matter.
          </p>
        </div>

        {/* Global actions */}
        {selectedJobId && (
          <div className="flex items-center gap-2">
            <a
              href={`${api.getZipDownloadUrl(selectedJobId)}`}
              download
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              <span>Download Crawl ZIP</span>
            </a>
          </div>
        )}
      </div>

      {/* Control Bar: Job Dropdown & Search */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">
            Select Crawl Job:
          </span>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:border-indigo-500 transition-colors"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                [{j.mode.toUpperCase()}] {j.target} ({j.pages_scraped} files)
              </option>
            ))}
          </select>
        </div>

        {/* Document search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, path, or URL..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Files Table / Tree */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">
              Generated Markdown Files in <code className="text-indigo-400 font-mono">pages/</code>
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredPages.length} documents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Document Title & Filepath</th>
                <th className="px-6 py-3.5">Source URL</th>
                <th className="px-6 py-3.5">Depth</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Loading markdown files...
                  </td>
                </tr>
              ) : filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No files found matching search or this job has not saved markdown pages yet.
                  </td>
                </tr>
              ) : (
                filteredPages.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => handlePreview(p)}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-white block">
                            {p.title || 'Untitled Document'}
                          </span>
                          <span className="text-[11px] font-mono text-indigo-300/80 block">
                            {p.file_path}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 max-w-sm truncate font-mono text-[11px] text-slate-400">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-indigo-400 truncate block"
                      >
                        {p.url}
                      </a>
                    </td>

                    <td className="px-6 py-3.5 font-mono text-slate-400">
                      {p.depth}
                    </td>

                    <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownloadSingle(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Download Markdown"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePreview(p)}
                          className="px-2.5 py-1 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Preview</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
