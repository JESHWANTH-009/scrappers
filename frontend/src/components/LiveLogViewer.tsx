import React, { useState, useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, Copy, Check, ArrowDownCircle } from 'lucide-react';

interface LiveLogViewerProps {
  logs: LogEntry[];
  title?: string;
  isStreaming?: boolean;
}

export const LiveLogViewer: React.FC<LiveLogViewerProps> = ({
  logs,
  title = 'Real-Time Activity Log',
  isStreaming = false,
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'WARN':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'ERROR':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col h-[380px]">
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">{title}</span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE SSE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center text-xs bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            {['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  filterLevel === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Auto Scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
            className={`p-1.5 rounded border transition-colors ${
              autoScroll
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Log list terminal output */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 bg-[#060a12]"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            No log entries matching filter.
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
            return (
              <div key={index} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/40 px-1 rounded">
                <span className="text-slate-500 select-none shrink-0">{timeStr}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border shrink-0 ${getLevelStyle(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
