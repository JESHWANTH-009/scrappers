import React, { useState, useEffect, useRef } from 'react';
import { CrawlJob, LogEntry, PageStatus } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { LiveLogViewer } from '../components/LiveLogViewer';
import {
  Globe,
  BookOpen,
  PauseCircle,
  RotateCcw,
  Download,
  FolderTree,
  FileText,
  Clock,
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface LiveCrawlPageProps {
  jobId: string;
  onOpenDetails: (jobId: string) => void;
  onOpenFiles: (jobId: string) => void;
}

export const LiveCrawlPage: React.FC<LiveCrawlPageProps> = ({
  jobId,
  onOpenDetails,
  onOpenFiles,
}) => {
  const [job, setJob] = useState<CrawlJob | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Fetch initial job details
  const fetchJob = async () => {
    try {
      const data = await api.getJob(jobId);
      setJob(data);
      if (data.started_at) {
        startTimeRef.current = new Date(data.started_at).getTime();
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
    }
  };

  // Fetch initial logs
  const fetchLogs = async () => {
    try {
      const initialLogs = await api.getJobLogs(jobId);
      setLogs(initialLogs);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    fetchJob();
    fetchLogs();

    // Timer for elapsed seconds if job is running
    const timer = setInterval(() => {
      if (job?.status === 'running') {
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedTime(Math.max(0, seconds));
      }
    }, 1000);

    // Establish real Server-Sent Events (SSE) connection
    const eventsUrl = api.getEventsUrl(jobId);
    const es = new EventSource(eventsUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setSseConnected(true);
    };

    es.addEventListener('connected', () => {
      setSseConnected(true);
    });

    es.addEventListener('job_update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setJob((prev) => (prev ? { ...prev, ...data } : prev));
      } catch (err) {
        console.error('Error parsing job_update SSE:', err);
      }
    });

    es.addEventListener('page_started', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setJob((prev) =>
          prev
            ? {
                ...prev,
                current_url: data.url,
                current_depth: data.depth,
              }
            : prev
        );
      } catch (err) {
        console.error('Error parsing page_started SSE:', err);
      }
    });

    es.addEventListener('page_completed', () => {
      fetchJob();
    });

    es.addEventListener('log_message', (e: MessageEvent) => {
      try {
        const newLog: LogEntry = JSON.parse(e.data);
        setLogs((prev) => [...prev, newLog]);
      } catch (err) {
        console.error('Error parsing log_message SSE:', err);
      }
    });

    es.addEventListener('job_finished', () => {
      fetchJob();
      fetchLogs();
    });

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      clearInterval(timer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [jobId]);

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      await api.cancelJob(jobId);
      await fetchJob();
    } catch (err) {
      console.error('Failed to cancel job:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      const newJob = await api.retryJob(jobId);
      window.location.reload();
    } catch (err) {
      console.error('Failed to retry job:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const isRunning = job?.status === 'running' || job?.status === 'pending';
  const isWiki = job?.mode === 'wikipedia';

  // Format elapsed time string (MM:SS)
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const total = job?.pages_discovered || 0;
  const scraped = job?.pages_scraped || 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round((scraped / total) * 100)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Box */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                {isWiki ? 'Wikipedia Topic Ingestion' : 'Website Crawler Pipeline'}
              </h2>
              {job && <StatusBadge status={job.status} />}
              {sseConnected && isRunning && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE STREAM
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="font-mono text-slate-300 font-semibold">{job?.target}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">Job: {jobId}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl transition-colors"
            >
              <PauseCircle className="w-4 h-4" />
              <span>{isCancelling ? 'Stopping...' : 'Cancel Crawl'}</span>
            </button>
          ) : (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Job</span>
            </button>
          )}

          <button
            onClick={() => onOpenDetails(jobId)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors"
          >
            <FolderTree className="w-4 h-4" />
            <span>Hierarchy</span>
          </button>

          <button
            onClick={() => onOpenFiles(jobId)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Files ({job?.markdown_files_count || 0})</span>
          </button>

          <a
            href={api.getZipDownloadUrl(jobId)}
            download
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" />
            <span>Download ZIP</span>
          </a>
        </div>
      </div>

      {/* Progress Bar & Current URL */}
      <div className="glass-card rounded-2xl border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 uppercase tracking-wider">
            Crawl Queue Completion
          </span>
          <span className="font-mono text-sm font-bold text-indigo-400">
            {progressPercent}%
          </span>
        </div>

        {/* Bar */}
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Current Active Processing Node */}
        {job?.current_url && isRunning && (
          <div className="flex items-center gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
            <span className="text-slate-500 select-none">Processing:</span>
            <span className="text-indigo-300 truncate font-medium">{job.current_url}</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 ml-auto shrink-0">
              Depth: {job.current_depth}
            </span>
          </div>
        )}
      </div>

      {/* Metrics Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Discovered</span>
            <Search className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {job?.pages_discovered || 0}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Scraped Pages</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {job?.pages_scraped || 0}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Failed Pages</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {job?.pages_failed || 0}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Markdown Files</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-400">
            {job?.markdown_files_count || 0}
          </div>
        </div>
      </div>

      {/* Embedded Live Activity Log Viewer */}
      <LiveLogViewer
        logs={logs}
        title={`Live Activity Log (${jobId})`}
        isStreaming={sseConnected && isRunning}
      />
    </div>
  );
};
