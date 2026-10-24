import React, { useState } from 'react';
import {
  Globe,
  BookOpen,
  Sliders,
  ShieldCheck,
  Play,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { URLCrawlRequest, WikipediaCrawlRequest, ScopeMode, WikiFollowStrategy } from '../types';
import { api } from '../services/api';

interface NewScrapePageProps {
  initialMode?: 'url' | 'wikipedia';
  onJobStarted: (jobId: string) => void;
}

export const NewScrapePage: React.FC<NewScrapePageProps> = ({
  initialMode = 'url',
  onJobStarted,
}) => {
  const [activeMode, setActiveMode] = useState<'url' | 'wikipedia'>(initialMode);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State for Option A: URL Scraping
  const [url, setUrl] = useState<string>('https://docs.example.com/guide/');
  const [includeSubdomains, setIncludeSubdomains] = useState<boolean>(false);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('path_strict');
  const [maxDepth, setMaxDepth] = useState<number>(3);
  const [maxPages, setMaxPages] = useState<number>(50);
  const [maxConcurrency, setMaxConcurrency] = useState<number>(3);
  const [includePatterns, setIncludePatterns] = useState<string>('');
  const [excludePatterns, setExcludePatterns] = useState<string>('');
  const [requestDelayMs, setRequestDelayMs] = useState<number>(300);

  // Form State for Option B: Wikipedia Scraping
  const [keyword, setKeyword] = useState<string>('Artificial Intelligence');
  const [wikiLang, setWikiLang] = useState<string>('en');
  const [maxArticles, setMaxArticles] = useState<number>(10);
  const [wikiDepth, setWikiDepth] = useState<number>(1);
  const [followStrategy, setFollowStrategy] = useState<WikiFollowStrategy>('seed_and_direct');
  const [includeSections, setIncludeSections] = useState<boolean>(true);
  const [includeReferences, setIncludeReferences] = useState<boolean>(false);
  const [relevanceFilter, setRelevanceFilter] = useState<boolean>(true);

  const handleStartUrlScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!url.trim()) {
      setErrorMessage('Please provide a valid starting URL.');
      return;
    }

    try {
      setLoading(true);
      const incList = includePatterns.split('\n').map((p) => p.trim()).filter(Boolean);
      const excList = excludePatterns.split('\n').map((p) => p.trim()).filter(Boolean);

      const req: URLCrawlRequest = {
        url: url.trim(),
        include_subdomains: includeSubdomains,
        scope_mode: scopeMode,
        max_depth: Number(maxDepth),
        max_pages: Number(maxPages),
        max_concurrency: Number(maxConcurrency),
        include_patterns: incList,
        exclude_patterns: excList,
        request_delay_ms: Number(requestDelayMs),
        timeout_seconds: 15.0,
      };

      const job = await api.startUrlCrawl(req);
      onJobStarted(job.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start URL scrape');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWikiScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!keyword.trim()) {
      setErrorMessage('Please provide a search keyword for Wikipedia.');
      return;
    }

    try {
      setLoading(true);
      const req: WikipediaCrawlRequest = {
        keyword: keyword.trim(),
        language: wikiLang.trim().toLowerCase(),
        max_articles: Number(maxArticles),
        max_depth: Number(wikiDepth),
        include_sections: includeSections,
        include_references: includeReferences,
        follow_links_strategy: followStrategy,
        relevance_filter: relevanceFilter,
      };

      const job = await api.startWikipediaCrawl(req);
      onJobStarted(job.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start Wikipedia scrape');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Configure New Scrape</h2>
        <p className="text-sm text-slate-400 mt-1">
          Select between general website crawling or encyclopedic Wikipedia topic extraction.
        </p>
      </div>

      {/* Mode Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Option A Card */}
        <div
          onClick={() => {
            setActiveMode('url');
            setErrorMessage(null);
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 flex items-start gap-4 ${
            activeMode === 'url'
              ? 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10'
              : 'glass-card border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
          }`}
        >
          <div
            className={`p-3 rounded-xl border shrink-0 ${
              activeMode === 'url'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Option A: Scrape Using URL</h3>
              {activeMode === 'url' && (
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Crawl any website or documentation portal starting from a root URL. Discovers links, enforces boundary scopes, and creates Markdown.
            </p>
          </div>
        </div>

        {/* Option B Card */}
        <div
          onClick={() => {
            setActiveMode('wikipedia');
            setErrorMessage(null);
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 flex items-start gap-4 ${
            activeMode === 'wikipedia'
              ? 'bg-emerald-600/10 border-emerald-500 shadow-lg shadow-emerald-500/10'
              : 'glass-card border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
          }`}
        >
          <div
            className={`p-3 rounded-xl border shrink-0 ${
              activeMode === 'wikipedia'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Option B: Scrape Using Keyword</h3>
              {activeMode === 'wikipedia' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Search Wikipedia via the official MediaWiki Action API. Harvests articles, structured sections, and follows related internal links.
            </p>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="flex-1 font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Forms Container */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-8 shadow-2xl">
        {activeMode === 'url' ? (
          /* FORM A: URL SCRAPING */
          <form onSubmit={handleStartUrlScrape} className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">URL Crawler Configuration</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  The initial URL is the root of the crawl. Eligible URLs will be crawled according to boundary settings.
                </p>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                SSRF Protected
              </span>
            </div>

            {/* Starting URL */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Starting URL <span className="text-indigo-400">*</span>
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.example.com/guide/"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm font-mono text-white placeholder-slate-600 transition-colors"
              />
              <p className="text-[11px] text-slate-400">
                Accepts HTTP and HTTPS. Localhost, link-local, and private IP addresses are automatically blocked.
              </p>
            </div>

            {/* Scope Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Crawl Scope Boundary
                </label>
                <select
                  value={scopeMode}
                  onChange={(e) => setScopeMode(e.target.value as ScopeMode)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-medium text-white transition-colors"
                >
                  <option value="path_strict">Strict: Stay under starting path directory (Default)</option>
                  <option value="same_hostname">Same Hostname: Entire domain</option>
                  <option value="subdomains">Subdomains: Allow all domain subdomains</option>
                </select>
              </div>

              <div className="space-y-2 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeSubdomains}
                    onChange={(e) => setIncludeSubdomains(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-700 bg-slate-900 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Include subdomains in scope
                  </span>
                </label>
              </div>
            </div>

            {/* Crawl Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Max Crawl Depth
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white transition-colors"
                />
                <span className="text-[10px] text-slate-400">0 = seed page only</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Max Number of Pages
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxPages}
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white transition-colors"
                />
                <span className="text-[10px] text-slate-400">Crawl stops when reached</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Max Concurrency
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white transition-colors"
                />
                <span className="text-[10px] text-slate-400">Concurrent workers</span>
              </div>
            </div>

            {/* Patterns & Delays */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Include URL Patterns (Optional)
                </label>
                <textarea
                  rows={2}
                  value={includePatterns}
                  onChange={(e) => setIncludePatterns(e.target.value)}
                  placeholder="/guide/.*\n.*install.*"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white placeholder-slate-600 transition-colors"
                />
                <span className="text-[10px] text-slate-400">One regex per line</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Exclude URL Patterns (Optional)
                </label>
                <textarea
                  rows={2}
                  value={excludePatterns}
                  onChange={(e) => setExcludePatterns(e.target.value)}
                  placeholder="/blog/.*\n.*archive.*"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs font-mono text-white placeholder-slate-600 transition-colors"
                />
                <span className="text-[10px] text-slate-400">One regex per line</span>
              </div>
            </div>

            {/* Politeness delay */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 uppercase tracking-wider">
                  Politeness Request Delay
                </span>
                <span className="font-mono text-indigo-400">{requestDelayMs} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={requestDelayMs}
                onChange={(e) => setRequestDelayMs(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{loading ? 'Initializing Crawl...' : 'Start URL Scraping'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* FORM B: WIKIPEDIA SCRAPING */
          <form onSubmit={handleStartWikiScrape} className="space-y-6">
            <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Wikipedia Scraper Configuration</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Queries the official MediaWiki API to harvest comprehensive encyclopedic knowledge.
                </p>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BookOpen className="w-3.5 h-3.5" />
                Action API v1
              </span>
            </div>

            {/* Keyword and Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Keyword or Search Phrase <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm font-medium text-white placeholder-slate-600 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Wikipedia Language
                </label>
                <select
                  value={wikiLang}
                  onChange={(e) => setWikiLang(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  <option value="en">English (en)</option>
                  <option value="de">German (de)</option>
                  <option value="fr">French (fr)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="it">Italian (it)</option>
                  <option value="ja">Japanese (ja)</option>
                  <option value="zh">Chinese (zh)</option>
                  <option value="pt">Portuguese (pt)</option>
                </select>
              </div>
            </div>

            {/* Article Count & Depth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Max Wikipedia Articles
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxArticles}
                  onChange={(e) => setMaxArticles(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white transition-colors"
                />
                <span className="text-[10px] text-slate-400">Total articles to extract and save</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Related Articles Depth
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={wikiDepth}
                  onChange={(e) => setWikiDepth(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono text-white transition-colors"
                />
                <span className="text-[10px] text-slate-400">0 = search seeds only</span>
              </div>
            </div>

            {/* Follow Links Strategy */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Link Following Strategy
              </label>
              <select
                value={followStrategy}
                onChange={(e) => setFollowStrategy(e.target.value as WikiFollowStrategy)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-medium text-white transition-colors"
              >
                <option value="seed_and_direct">Seed articles + directly linked articles (Recommended)</option>
                <option value="seed_only">Seed articles only</option>
                <option value="recursive">Recursive related-article crawl (up to depth limit)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-2 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={includeSections}
                  onChange={(e) => setIncludeSections(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-slate-200">
                  Preserve section hierarchy
                </span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={includeReferences}
                  onChange={(e) => setIncludeReferences(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-slate-200">
                  Include article references
                </span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={relevanceFilter}
                  onChange={(e) => setRelevanceFilter(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-slate-200">
                  Keyword relevance filter
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{loading ? 'Searching Wikipedia...' : 'Start Wikipedia Scraping'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
