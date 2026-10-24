export type CrawlMode = 'url' | 'wikipedia';

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

export type PageStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';

export type ScopeMode = 'path_strict' | 'same_hostname' | 'subdomains';

export type WikiFollowStrategy = 'seed_only' | 'seed_and_direct' | 'recursive';

export interface URLCrawlRequest {
  url: string;
  include_subdomains?: boolean;
  scope_mode?: ScopeMode;
  max_depth?: number;
  max_pages?: number;
  max_concurrency?: number;
  include_patterns?: string[];
  exclude_patterns?: string[];
  request_delay_ms?: number;
  timeout_seconds?: number;
}

export interface WikipediaCrawlRequest {
  keyword: string;
  language?: string;
  max_articles?: number;
  max_depth?: number;
  include_sections?: boolean;
  include_references?: boolean;
  follow_links_strategy?: WikiFollowStrategy;
  relevance_filter?: boolean;
}

export interface CrawlJob {
  id: string;
  mode: CrawlMode;
  target: string;
  config: Record<string, any>;
  status: JobStatus;
  pages_discovered: number;
  pages_scraped: number;
  pages_failed: number;
  markdown_files_count: number;
  current_url?: string | null;
  current_depth: number;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  manifest_path?: string | null;
}

export interface CrawlPage {
  id: string;
  job_id: string;
  url: string;
  canonical_url?: string | null;
  parent_url?: string | null;
  depth: number;
  status: PageStatus;
  http_status?: number | null;
  file_path?: string | null;
  title?: string | null;
  content_hash?: string | null;
  error_message?: string | null;
  scraped_at?: string | null;
  discovered_links_count: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface CrawlStats {
  total_jobs: number;
  total_pages_discovered: number;
  total_pages_scraped: number;
  total_markdown_files: number;
  active_jobs: number;
  recent_jobs: CrawlJob[];
}

export interface PageNode {
  url: string;
  title: string;
  path?: string | null;
  depth: number;
  status: PageStatus;
  children: PageNode[];
}

export interface Manifest {
  job_id: string;
  mode: CrawlMode;
  target: string;
  status: JobStatus;
  created_at: string;
  completed_at?: string | null;
  config: Record<string, any>;
  summary: {
    total_pages_discovered: number;
    total_pages_scraped: number;
    total_pages_failed: number;
    total_markdown_files: number;
  };
  hierarchy: {
    roots: PageNode[];
  };
  pages: CrawlPage[];
  logs: LogEntry[];
}
