import {
  CrawlJob,
  CrawlPage,
  CrawlStats,
  LogEntry,
  Manifest,
  URLCrawlRequest,
  WikipediaCrawlRequest
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getStats(): Promise<CrawlStats> {
    const res = await fetch(`${API_BASE}/crawls/stats`);
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    return res.json();
  },

  async startUrlCrawl(req: URLCrawlRequest): Promise<CrawlJob> {
    const res = await fetch(`${API_BASE}/crawls/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to start URL crawl');
    }
    return res.json();
  },

  async startWikipediaCrawl(req: WikipediaCrawlRequest): Promise<CrawlJob> {
    const res = await fetch(`${API_BASE}/crawls/wikipedia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to start Wikipedia crawl');
    }
    return res.json();
  },

  async listJobs(limit = 50, offset = 0, status?: string, mode?: string): Promise<CrawlJob[]> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status) params.append('status', status);
    if (mode) params.append('mode', mode);

    const res = await fetch(`${API_BASE}/crawls?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to list jobs: ${res.statusText}`);
    return res.json();
  },

  async getJob(jobId: string): Promise<CrawlJob> {
    const res = await fetch(`${API_BASE}/crawls/${encodeURIComponent(jobId)}`);
    if (!res.ok) throw new Error(`Failed to get job: ${res.statusText}`);
    return res.json();
  },

  async cancelJob(jobId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/crawls/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to cancel job: ${res.statusText}`);
    return res.json();
  },

  async retryJob(jobId: string): Promise<CrawlJob> {
    const res = await fetch(`${API_BASE}/crawls/${encodeURIComponent(jobId)}/retry`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Failed to retry job: ${res.statusText}`);
    return res.json();
  },

  async getJobPages(jobId: string): Promise<CrawlPage[]> {
    const res = await fetch(`${API_BASE}/crawls/${encodeURIComponent(jobId)}/pages`);
    if (!res.ok) throw new Error(`Failed to get pages: ${res.statusText}`);
    return res.json();
  },

  async getJobLogs(jobId: string, limit = 200): Promise<LogEntry[]> {
    const res = await fetch(`${API_BASE}/crawls/${encodeURIComponent(jobId)}/logs?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to get logs: ${res.statusText}`);
    return res.json();
  },

  async getManifest(jobId: string): Promise<Manifest> {
    const res = await fetch(`${API_BASE}/crawls/${encodeURIComponent(jobId)}/manifest`);
    if (!res.ok) throw new Error(`Failed to get manifest: ${res.statusText}`);
    return res.json();
  },

  async getPageContent(jobId: string, pageId: string): Promise<{
    page_id: string;
    title: string;
    url: string;
    file_path: string;
    content: string;
  }> {
    const res = await fetch(
      `${API_BASE}/crawls/${encodeURIComponent(jobId)}/pages/${encodeURIComponent(pageId)}/content`
    );
    if (!res.ok) throw new Error(`Failed to fetch page content: ${res.statusText}`);
    return res.json();
  },

  getZipDownloadUrl(jobId: string): string {
    return `${API_BASE}/crawls/${encodeURIComponent(jobId)}/download`;
  },

  getEventsUrl(jobId: string): string {
    return `${API_BASE}/crawls/${encodeURIComponent(jobId)}/events`;
  }
};
