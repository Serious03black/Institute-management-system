import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw, Clock, CheckCircle, AlertCircle, Copy, Check, ShieldCheck, KeyRound } from 'lucide-react';
import { PageHeader, Badge, Card, Spinner, ErrorMessage } from '../../components/ui/Cards';
import { Table, Pagination } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';
import type { ExamCredential, ExamAttempt, Student } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type ExamTab = 'form' | 'details' | 'recent' | 'logs';

export function ExamsPage() {
  const [tab, setTab] = useState<ExamTab>('form');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Examination Control Center"
        subtitle="Generate student exam access keys, monitor real-time test attempts, and inspect exam logs"
      />

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-x-auto">
        {[
          { key: 'form', label: 'Generate Access Keys' },
          { key: 'details', label: 'Active Credentials' },
          { key: 'recent', label: 'Live Exam Monitoring' },
          { key: 'logs', label: 'Audit Examination Logs' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as ExamTab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
              tab === t.key
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'form' && <ExamFormTab />}
      {tab === 'details' && <ExamDetailsTab />}
      {tab === 'recent' && <RecentExamsTab />}
      {tab === 'logs' && <ExamLogsTab />}
    </div>
  );
}

// ==================== EXAM FORM TAB ====================
function ExamFormTab() {
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ examUsername: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const searchStudent = async () => {
    if (!studentId.trim()) return;
    setSearchLoading(true);
    setStudent(null);
    setCredentials(null);
    try {
      const { data } = await api.get(`/students/${studentId}`);
      setStudent(data.data);
    } catch {
      toast.error('Student not found with this ID');
    } finally {
      setSearchLoading(false);
    }
  };

  const generateCredentials = async () => {
    if (!student) return;
    setGenerateLoading(true);
    try {
      const { data } = await api.post('/exams/credentials', { studentId: student.studentId });
      setCredentials({ examUsername: data.data.examUsername, password: data.data.password });
      toast.success('Exam credentials generated!');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to generate credentials');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleCopy = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Username: ${credentials.examUsername}\nPassword: ${credentials.password}`);
    setCopied(true);
    toast.success('Copied credentials to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <Card className="p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Generate Single-Student Credentials</h3>
        <p className="text-xs text-slate-400 mb-4">
          Lookup an eligible enrolled student to issue secure examination login keys
        </p>

        <div className="flex gap-2.5">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
              placeholder="Enter Student ID (e.g. STU268932)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <Button
            onClick={searchStudent}
            loading={searchLoading}
            variant="gradient"
            icon={<Search className="w-4 h-4" />}
          >
            Lookup
          </Button>
        </div>
      </Card>

      {student && (
        <Card className="p-6 space-y-4">
          <div className="flex items-start justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {student.personalInfo?.name?.charAt(0) || 'S'}
              </div>
              <div>
                <h4 className="font-bold text-white text-base font-heading">{student.personalInfo?.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-indigo-400 text-xs">{student.studentId}</span>
                  <Badge variant={student.status === 'CURRENT' ? 'success' : 'danger'} dot>
                    {student.status}
                  </Badge>
                </div>
              </div>
            </div>

            {student.status === 'CURRENT' && (
              <Button
                onClick={generateCredentials}
                loading={generateLoading}
                variant="gradient"
                size="sm"
                icon={<KeyRound className="w-3.5 h-3.5" />}
              >
                Generate Access Key
              </Button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Course</p>
              <p className="text-white mt-0.5">{student.enrollment?.courseTitleSnapshot || 'General'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Assigned Faculty</p>
              <p className="text-white mt-0.5">{student.enrollment?.facultyNameSnapshot || '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase mb-2">Allowed Test Modules</p>
            <div className="flex flex-wrap gap-1.5">
              {student.enrollment?.moduleSnapshots?.map((m) => (
                <span
                  key={String(m.moduleId)}
                  className="px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs rounded-lg font-medium"
                >
                  {m.title}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {credentials && (
        <Card className="p-6 bg-emerald-950/30 border-emerald-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-white text-sm font-heading">Credentials Generated Successfully</h4>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all border border-emerald-500/30"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Exam Portal Username:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{credentials.examUsername}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-slate-400">One-Time Password:</span>
              <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-sm">
                {credentials.password}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-2.5">
            Important: Share this password with the student. For security reasons, hashed credentials cannot be recovered once this modal is closed.
          </p>
        </Card>
      )}
    </div>
  );
}

// ==================== EXAM DETAILS TAB ====================
function ExamDetailsTab() {
  const [credentials, setCredentials] = useState<ExamCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [resetTarget, setResetTarget] = useState<ExamCredential | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ examUsername: string; password: string } | null>(null);

  const fetchCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/exams/credentials', {
        params: { page, limit: 20, search: search || undefined },
      });
      setCredentials(data.data || []);
      setTotal(data.total || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const { data } = await api.post(`/exams/credentials/${resetTarget._id}/reset`);
      setNewCredentials({ examUsername: data.data.examUsername, password: data.data.password });
      toast.success('Credentials regenerated');
      fetchCredentials();
    } catch {
      toast.error('Failed to reset credentials');
    } finally {
      setResetLoading(false);
    }
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (c: ExamCredential) => (
        <div>
          <p className="font-semibold text-white">{(c.studentId as Student)?.personalInfo?.name}</p>
          <p className="font-mono text-xs text-indigo-400">{(c.studentId as Student)?.studentId}</p>
        </div>
      ),
    },
    {
      key: 'examUsername',
      header: 'Exam Username',
      render: (c: ExamCredential) => (
        <span className="font-mono text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
          {c.examUsername}
        </span>
      ),
    },
    {
      key: 'modules',
      header: 'Allowed Modules',
      render: (c: ExamCredential) => (
        <span className="text-xs text-slate-300">
          {c.allowedModuleIds?.length || 0} module{(c.allowedModuleIds?.length || 0) !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c: ExamCredential) => (
        <Badge variant={c.status === 'ACTIVE' ? 'success' : 'danger'} dot>
          {c.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (c: ExamCredential) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setResetTarget(c);
            setNewCredentials(null);
          }}
          icon={<RefreshCw className="w-3 h-3" />}
        >
          Reset Key
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search credential records by student ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/70 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
      </Card>

      <Table
        columns={columns}
        data={credentials}
        loading={loading}
        rowKey={(c) => c._id}
        emptyMessage="No exam credentials issued yet"
      />
      <Pagination page={page} total={total} limit={20} onPage={setPage} />

      <Modal
        open={!!resetTarget}
        onClose={() => {
          setResetTarget(null);
          setNewCredentials(null);
        }}
        title="Regenerate Student Exam Key"
        size="sm"
        footer={
          !newCredentials ? (
            <>
              <Button variant="outline" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReset} loading={resetLoading}>
                Generate New Password
              </Button>
            </>
          ) : undefined
        }
      >
        {!newCredentials ? (
          <p className="text-xs text-slate-300 leading-relaxed">
            Reset access credentials for{' '}
            <strong className="text-white">{(resetTarget?.studentId as Student)?.personalInfo?.name}</strong>?
            The previous password will be invalidated immediately.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
              Access Credentials Successfully Reset
            </div>
            <div className="bg-slate-950/80 rounded-xl p-4 space-y-2 border border-white/10 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Username:</span>
                <span className="font-mono font-bold text-white">{newCredentials.examUsername}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-slate-400">New Password:</span>
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {newCredentials.password}
                </span>
              </div>
            </div>
            <Button onClick={() => setResetTarget(null)} className="w-full" variant="gradient">
              Dismiss
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ==================== RECENT EXAMS TAB ====================
function RecentExamsTab() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/exams/recent', { params: { page, limit: 20 } });
      setAttempts(data.data || []);
      setTotal(data.total || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (a: ExamAttempt) => (
        <div>
          <p className="font-semibold text-white">{(a.studentId as Student)?.personalInfo?.name}</p>
          <p className="font-mono text-xs text-indigo-400">{(a.studentId as Student)?.studentId}</p>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Test Module',
      render: (a: ExamAttempt) => (
        <span className="text-slate-200 font-medium">{(a.moduleId as { title: string })?.title}</span>
      ),
    },
    {
      key: 'type',
      header: 'Attempt Type',
      render: (a: ExamAttempt) => (
        <Badge variant={a.attemptType === 'REEXAM' ? 'warning' : 'cyan'}>
          {a.attemptType}
        </Badge>
      ),
    },
    {
      key: 'start',
      header: 'Initiated At',
      render: (a: ExamAttempt) => (
        <span className="text-slate-400 text-xs">
          {a.startTime ? format(new Date(a.startTime), 'dd MMM, HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'deadline',
      header: 'Time Limit',
      render: (a: ExamAttempt) => (
        <span className="text-slate-400 text-xs">
          {a.deadline ? format(new Date(a.deadline), 'HH:mm') : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Live Status',
      render: (a: ExamAttempt) => {
        const isLive = a.attemptStatus === 'IN_PROGRESS';
        return (
          <Badge
            variant={
              isLive
                ? 'warning'
                : a.attemptStatus.includes('SUBMITTED')
                ? 'info'
                : 'success'
            }
            dot={isLive}
          >
            {a.attemptStatus.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Table
        columns={columns}
        data={attempts}
        loading={loading}
        rowKey={(a) => a._id}
        emptyMessage="No active or recent exam attempts"
      />
      <Pagination page={page} total={total} limit={20} onPage={setPage} />
    </div>
  );
}

// ==================== EXAM LOGS TAB ====================
function ExamLogsTab() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStudentId, setFilterStudentId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/exams/logs', {
        params: { page, limit: 20, studentId: filterStudentId || undefined },
      });
      setAttempts(data.data || []);
      setTotal(data.total || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filterStudentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      key: 'attemptId',
      header: 'Attempt ID',
      render: (a: ExamAttempt) => (
        <span className="font-mono text-xs text-indigo-400 font-semibold">{a.attemptId}</span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      render: (a: ExamAttempt) => (
        <div>
          <p className="font-semibold text-white">{(a.studentId as Student)?.personalInfo?.name}</p>
          <p className="font-mono text-xs text-slate-500">{(a.studentId as Student)?.studentId}</p>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      render: (a: ExamAttempt) => (
        <span className="text-slate-200">{(a.moduleId as { title: string })?.title}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (a: ExamAttempt) => (
        <Badge variant={a.attemptType === 'REEXAM' ? 'warning' : 'default'}>{a.attemptType}</Badge>
      ),
    },
    {
      key: 'answered',
      header: 'Responses',
      render: (a: ExamAttempt) => (
        <span className="text-xs text-slate-300 font-mono">
          {a.answers?.length || 0} / {a.selectedQuestions?.length || 0}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (a: ExamAttempt) => (
        <span className="text-xs text-slate-400">
          {a.durationSeconds
            ? `${Math.floor(a.durationSeconds / 60)}m ${a.durationSeconds % 60}s`
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a: ExamAttempt) => (
        <Badge
          variant={
            a.attemptStatus === 'EVALUATED'
              ? 'success'
              : a.attemptStatus.includes('SUBMITTED')
              ? 'info'
              : 'warning'
          }
        >
          {a.attemptStatus.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (a: ExamAttempt) => (
        <span className="text-xs text-slate-400">
          {a.submissionTime ? format(new Date(a.submissionTime), 'dd MMM, HH:mm') : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filterStudentId}
            onChange={(e) => {
              setFilterStudentId(e.target.value);
              setPage(1);
            }}
            placeholder="Filter logs by Student ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/70 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
      </Card>
      <Table
        columns={columns}
        data={attempts}
        loading={loading}
        rowKey={(a) => a._id}
        emptyMessage="No exam logs recorded yet"
      />
      <Pagination page={page} total={total} limit={20} onPage={setPage} />
    </div>
  );
}
