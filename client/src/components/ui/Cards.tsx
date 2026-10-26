import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
  gradient?: string;
  trend?: { value: number; label: string };
  badgeText?: string;
}

export function StatCard({
  title,
  value,
  icon,
  gradient = 'from-indigo-500 to-purple-600',
  trend,
  badgeText,
}: StatCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 shadow-xl hover:border-indigo-500/40 hover:shadow-indigo-500/10 transition-all duration-300">
      {/* Background radial highlight */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">{title}</p>
            {badgeText && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-3xl font-extrabold text-white tracking-tight font-heading mt-1">{value}</p>
          {trend && (
            <div
              className={`inline-flex items-center gap-1.5 mt-2.5 px-2 py-0.5 rounded-full text-xs font-medium border ${
                trend.value >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {trend.value > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : trend.value < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              <span>{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 flex-shrink-0 group-hover:scale-105 transition-transform`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple' | 'cyan';
  dot?: boolean;
  className?: string;
}

const badgeVariants = {
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  default: 'bg-slate-800 text-slate-300 border-white/10',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

const dotColors = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-sky-400',
  default: 'bg-slate-400',
  purple: 'bg-purple-400',
  cyan: 'bg-cyan-400',
};

export function Badge({ children, variant = 'default', dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeVariants[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />}
      <span>{children}</span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/5 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-heading">
          {title}
        </h1>
        {subtitle && <p className="text-xs lg:text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl ${
        hover ? 'hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${s[size]} border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin`} />
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl bg-rose-500/5 border border-rose-500/20">
      <div className="w-12 h-12 bg-rose-500/15 rounded-2xl flex items-center justify-center mb-3 text-rose-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <p className="text-rose-400 font-semibold mb-1">Encountered an Error</p>
      <p className="text-slate-400 text-xs max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
