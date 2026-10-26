import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Button } from './Button';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPage: (page: number) => void;
}

export function Table<T>({
  columns,
  data,
  loading,
  emptyMessage = 'No records found',
  rowKey,
}: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-950/70 border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3.5 whitespace-nowrap ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-4">
                      <div className="h-4 bg-white/10 rounded-md" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">{emptyMessage}</p>
                    <p className="text-xs text-slate-500">Records will show up here once created or imported</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="hover:bg-white/[0.04] transition-colors duration-150 group"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-4 text-slate-200 ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Pagination({ page, total, limit, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 px-1 py-2">
      <span>
        Showing <strong className="text-white">{Math.min((page - 1) * limit + 1, total)}</strong> to{' '}
        <strong className="text-white">{Math.min(page * limit, total)}</strong> of{' '}
        <strong className="text-white">{total}</strong> entries
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-2.5"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = i + 1;
          return (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onPage(p)}
              className="w-8 h-8 p-0"
            >
              {p}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-2.5"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
