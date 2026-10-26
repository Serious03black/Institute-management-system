import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react';
import { PageHeader, Badge, Card, Spinner } from '../../components/ui/Cards';
import { Table } from '../../components/ui/Table';
import type { Student, Batch } from '../../types';
import api from '../../services/api';

export function BatchesPage() {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'ALTERNATE' | 'WEEKLY'>('DAILY');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/batches', {
        params: { batchType: activeTab, status: 'ACTIVE' },
      });
      const list = data.data || [];
      setBatches(list);
      if (list.length > 0) {
        fetchBatchStudents(list[0]);
      } else {
        setSelectedBatch(null);
        setBatchStudents([]);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const fetchBatchStudents = async (batch: Batch) => {
    setSelectedBatch(batch);
    setStudentsLoading(true);
    try {
      const { data } = await api.get(`/batches/${batch._id}/students`);
      setBatchStudents(data.data || []);
    } catch {
      setBatchStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const studentCols = [
    {
      key: 'studentId',
      header: 'Student ID',
      render: (s: Student) => (
        <span className="font-mono text-indigo-400 font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          {s.studentId}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Student Name',
      render: (s: Student) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {s.personalInfo?.name?.charAt(0) || 'S'}
          </div>
          <span className="font-semibold text-white">{s.personalInfo?.name}</span>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (s: Student) => (
        <span className="text-slate-300 font-medium">
          {s.enrollment?.courseTitleSnapshot || 'General Course'}
        </span>
      ),
    },
    {
      key: 'faculty',
      header: 'Faculty Guide',
      render: (s: Student) => (
        <span className="text-slate-400">{s.enrollment?.facultyNameSnapshot || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: Student) => (
        <Badge variant={s.status === 'CURRENT' ? 'success' : 'default'} dot>
          {s.status}
        </Badge>
      ),
    },
  ];

  const tabs = [
    { key: 'DAILY' as const, label: 'Daily Batches', desc: 'Monday–Saturday, 1-hour interactive slots' },
    { key: 'ALTERNATE' as const, label: 'Alternate Batches', desc: 'Group A & Group B, 2-hour intensive slots' },
    { key: 'WEEKLY' as const, label: 'Weekly Batches', desc: 'Saturday, 4-hour comprehensive weekend session' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Batch Timetable & Scheduling"
        subtitle="Manage daily, alternate (Mon-Wed-Fri / Tue-Thu-Sat), and weekend student batch allocations"
      />

      {/* Tabs */}
      <div className="grid sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`text-left p-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === t.key
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <span className="block font-bold text-xs tracking-wide">{t.label}</span>
            <span
              className={`text-[11px] block mt-0.5 ${
                activeTab === t.key ? 'text-indigo-200' : 'text-slate-500'
              }`}
            >
              {t.desc}
            </span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Available batch slots */}
        <div className="lg:col-span-1 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Available Slots ({batches.length})
            </p>
            <Badge variant="cyan">Live</Badge>
          </div>

          {loading ? (
            <Spinner />
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs rounded-2xl bg-white/[0.02] border border-white/5">
              No batches found for this schedule category.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {batches.map((batch) => {
                const isSelected = selectedBatch?._id === batch._id;
                return (
                  <button
                    key={batch._id}
                    onClick={() => fetchBatchStudents(batch)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-900/60 backdrop-blur-xl border-white/10 text-slate-300 hover:border-indigo-500/30 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-indigo-500 text-white shadow-md' : 'bg-white/5 text-indigo-400 border border-white/10'
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-xs font-heading">
                          {batch.startTime} – {batch.endTime}
                        </p>
                        <p
                          className={`text-[11px] mt-0.5 truncate ${
                            isSelected ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {batch.batchType === 'ALTERNATE' && batch.alternateGroup
                            ? `Group ${batch.alternateGroup} · `
                            : ''}
                          {batch.applicableDays?.join(', ') || 'All Days'}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                        {batch.batchId}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Students enrolled in selected slot */}
        <div className="lg:col-span-2">
          {selectedBatch ? (
            <div className="space-y-4">
              <Card className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm font-heading">
                      {selectedBatch.startTime} – {selectedBatch.endTime} ({selectedBatch.batchType})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {batchStudents.length} student{batchStudents.length !== 1 ? 's' : ''} assigned to this timetable slot
                    </p>
                  </div>
                </div>
                <Badge variant="success" dot>Active Timetable</Badge>
              </Card>

              <Table
                columns={studentCols}
                data={batchStudents}
                loading={studentsLoading}
                rowKey={(s) => s._id}
                emptyMessage="No students assigned to this batch slot"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs rounded-2xl bg-white/[0.02] border border-white/5">
              <Calendar className="w-12 h-12 mb-2 opacity-30 text-indigo-400" />
              <p>Select a batch slot from the left to view assigned students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
