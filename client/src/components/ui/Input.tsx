import React, { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const baseInput = `w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-inner`;

export function Input({ label, error, helpText, icon, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-300">{label}</label>}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <input
          className={`${baseInput} ${icon ? 'pl-9' : ''} ${
            error ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
      {helpText && !error && <p className="text-[11px] text-slate-400">{helpText}</p>}
    </div>
  );
}

export function Select({ label, error, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-300">{label}</label>}
      <select
        className={`${baseInput} ${
          error ? 'border-rose-500/60 focus:border-rose-500' : ''
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" className="bg-slate-900 text-slate-400">
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-slate-900 text-white">
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-300">{label}</label>}
      <textarea
        className={`${baseInput} resize-none ${
          error ? 'border-rose-500/60 focus:border-rose-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
}
