import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Settings,
  ShieldCheck,
  Server,
  FileCheck,
  Cpu,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const check = async () => {
      try {
        setLoading(true);
        const data = await api.getHealth();
        setHealth(data);
      } catch (err) {
        console.error('Health check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">System Settings & Configuration</h2>
        <p className="text-sm text-slate-400 mt-1">
          Review pipeline parameters, active SSRF safety rules, and server diagnostic metrics.
        </p>
      </div>

      {/* Backend Status Card */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">FastAPI Backend Engine</h3>
              <p className="text-xs text-slate-400">Asynchronous crawler & API server</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-200 capitalize">
              {health?.status || 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-slate-500 block mb-1">API Base URL</span>
            <span className="text-indigo-400 font-semibold">{import.meta.env.VITE_API_BASE_URL || '/api'}</span>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-slate-500 block mb-1">Engine Version</span>
            <span className="text-white font-semibold">{health?.version || '1.0.0'}</span>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
            <span className="text-slate-500 block mb-1">Storage Root</span>
            <span className="text-emerald-400 truncate block">data/crawls</span>
          </div>
        </div>
      </div>

      {/* SSRF & Responsible Crawling Guardrails */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Security & SSRF Protections</h3>
            <p className="text-xs text-slate-400">Strict network boundaries preventing unauthorized intranet access</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Private & Loopback IP Filtering</span>
              <p className="text-slate-400 mt-0.5">
                Automatically resolves target hostnames via DNS and blocks requests resolving to loopback (127.0.0.1, ::1), private ranges (10.x, 172.16.x, 192.168.x), or link-local addresses.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Cloud Metadata Endpoint Blocking</span>
              <p className="text-slate-400 mt-0.5">
                Hardcoded guards reject attempts to hit cloud hypervisor metadata services (e.g. 169.254.169.254, metadata.google.internal).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Redirect Destination Re-Validation</span>
              <p className="text-slate-400 mt-0.5">
                Every 3xx HTTP redirect step is inspected before following, defeating open redirect exploits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RAG Metadata Specification */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">RAG Front Matter Schema</h3>
            <p className="text-xs text-slate-400">Structured YAML headers embedded in every extracted document</p>
          </div>
        </div>

        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
          <pre>{`---
title: "Article or Page Title"
source_url: "https://docs.example.com/guide/install/"
canonical_url: "https://docs.example.com/guide/install/"
parent_url: "https://docs.example.com/guide/"
job_id: "url_20261023_120000_a1b2c3"
scraped_at: "2026-10-23T12:00:00Z"
content_hash: "3a5b8c... (SHA256)"
crawl_depth: 1
source_type: "website" | "wikipedia"
language: "en"
http_status: 200
---`}</pre>
        </div>
      </div>
    </div>
  );
};
