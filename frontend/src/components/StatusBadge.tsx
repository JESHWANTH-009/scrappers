import React from 'react';
import { JobStatus, PageStatus } from '../types';
import { CheckCircle2, Clock, AlertCircle, XCircle, PauseCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: JobStatus | PageStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  switch (status) {
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      );
    case 'partially_completed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 ${sizeClasses}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          Partial
        </span>
      );
    case 'running':
    case 'processing':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 ${sizeClasses}`}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Running
        </span>
      );
    case 'pending':
    case 'queued':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/20 ${sizeClasses}`}>
          <Clock className="w-3.5 h-3.5" />
          Queued
        </span>
      );
    case 'failed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 ${sizeClasses}`}>
          <XCircle className="w-3.5 h-3.5" />
          Failed
        </span>
      );
    case 'cancelled':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 ${sizeClasses}`}>
          <PauseCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    case 'interrupted':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 ${sizeClasses}`}>
          <AlertCircle className="w-3.5 h-3.5" />
          Interrupted
        </span>
      );
    case 'skipped':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 ${sizeClasses}`}>
          Skipped
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
