import React from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'indigo' | 'emerald' | 'amber' | 'cyan';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accent = 'indigo',
}) => {
  const accentStyles = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/40',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/40',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 group-hover:border-cyan-500/40',
  }[accent];

  return (
    <div className="group glass-card rounded-xl p-5 border transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-lg border transition-colors ${accentStyles}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  );
};
