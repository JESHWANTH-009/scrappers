import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Code2, Globe } from 'lucide-react';

interface MarkdownPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  filePath: string;
  content: string;
}

export const MarkdownPreviewModal: React.FC<MarkdownPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  url,
  filePath,
  content,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');

  if (!isOpen) return null;

  // Split frontmatter and body
  let frontmatter = '';
  let bodyContent = content;

  if (content.startsWith('---')) {
    const parts = content.split('---');
    if (parts.length >= 3) {
      frontmatter = parts[1].trim();
      bodyContent = parts.slice(2).join('---').trim();
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const filename = filePath.split('/').pop() || 'document.md';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">{title || 'Markdown Preview'}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-indigo-300 truncate">{filePath}</span>
                <span>•</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors truncate"
                >
                  <Globe className="w-3 h-3" />
                  <span className="truncate">{url}</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rendered
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeTab === 'raw'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw Markdown
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Front Matter Card */}
          {frontmatter && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-mono text-xs text-slate-300">
              <div className="flex items-center gap-2 mb-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
                <Code2 className="w-4 h-4" />
                <span>RAG Metadata (YAML Front Matter)</span>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-400">
                {frontmatter}
              </pre>
            </div>
          )}

          {/* Document Content */}
          {activeTab === 'raw' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 font-mono text-xs text-slate-300">
              <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {content}
              </pre>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none space-y-4 text-slate-200 text-sm leading-relaxed">
              {/* Clean structured rendering */}
              <div className="whitespace-pre-wrap font-sans">
                {bodyContent}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
