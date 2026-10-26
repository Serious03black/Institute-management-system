import React, { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gradient';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 hover:shadow-indigo-500/40',
  gradient:
    'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/25 border border-white/20',
  secondary:
    'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 backdrop-blur-md',
  danger:
    'bg-red-600/90 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 border border-red-400/30',
  ghost:
    'hover:bg-white/10 text-slate-300 hover:text-white',
  outline:
    'border border-white/15 hover:border-indigo-400/50 hover:bg-white/[0.05] text-slate-200 bg-slate-900/50 backdrop-blur-sm',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-xs font-semibold gap-2 rounded-xl',
  lg: 'px-5 py-2.5 text-sm font-semibold gap-2.5 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : icon}
      {children}
    </button>
  );
}
