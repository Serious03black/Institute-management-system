import React, { useState, useEffect, useCallback } from 'react';
import { Search, Shield, Filter, FileText } from 'lucide-react';
import { PageHeader, Card } from '../../components/ui/Cards';
import { Table, Pagination } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Cards';
import api from '../../services/api';
import type { AuditLog } from '../../types';
import { format } from 'date-fns';

export function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', entityType: '', actorId: '', from: '', to: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (filters.action) params.action = filters.action;
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.actorId) params.actorId = filters.actorId;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get('/audit-logs', { params });
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionColor = (action: string): 'success' | 'danger' | 'warning' | 'info' | 'purple' => {
    if (action.includes('CREATED') || action.includes('UPLOADED')) return 'success';
    if (action.includes('CANCELLED') || action.includes('DELETED')) return 'danger';
    if (action.includes('UPDATED') || action.includes('RESET')) return 'warning';
    if (action.includes('LOGIN') || action.includes('EXAM')) return 'info';
    return 'purple';
  };

  const columns = [
    {
      key: 'timestamp',
      header: 'Event Timestamp',
      render: (l: AuditLog) => (
        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
          {format(new Date(l.timestamp), 'dd MMM yyyy, HH:mm:ss')}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor ID',
      render: (l: AuditLog) => (
        <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          {l.actorId}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action Taken',
      render: (l: AuditLog) => (
        <Badge variant={actionColor(l.action)} dot>
          {l.action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'entityType',
      header: 'Target Entity',
      render: (l: AuditLog) => (
        <span className="text-xs font-medium text-slate-200">{l.entityType}</span>
      ),
    },
    {
      key: 'entityId',
      header: 'Entity Identifier',
      render: (l: AuditLog) => (
        <span className="font-mono text-xs text-slate-300">{l.entityId || '—'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Audit Justification',
      render: (l: AuditLog) => (
        <span className="text-xs text-slate-400 max-w-xs truncate block" title={l.reason || ''}>
          {l.reason || '—'}
        </span>
      ),
    },
  ];

  const entityTypes = [
    'Student',
    'Faculty',
    'Course',
    'Module',
    'Admin',
    'ExamCredential',
    'ExamAttempt',
    'QuestionBank',
    'ModuleResult',
    'Settings',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Security & System Audit Logs"
        subtitle="Immutable security trail of all administrative events, updates, exam attempts, and evaluations"
      />

      <Card className="p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              placeholder="Filter action (e.g. LOGIN)..."
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <select
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
            className="px-3 py-2 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="" className="bg-slate-900">All Target Entities</option>
            {entityTypes.map((t) => (
              <option key={t} value={t} className="bg-slate-900">
                {t}
              </option>
            ))}
          </select>
          <input
            value={filters.actorId}
            onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
            placeholder="Filter Actor ID..."
            className="px-3 py-2 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="px-3 py-2 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="px-3 py-2 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </Card>

      <div className="space-y-4">
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          rowKey={(l) => l._id}
          emptyMessage="No audit logs matched your query"
        />
        <Pagination page={page} total={total} limit={50} onPage={setPage} />
      </div>
    </div>
  );
}
