import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Edit, XCircle, Eye, Download, UserCheck, GraduationCap } from 'lucide-react';
import { PageHeader, Badge, Card, Spinner, ErrorMessage } from '../../components/ui/Cards';
import { Table, Pagination } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import api from '../../services/api';
import type { Student, Course, Faculty } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { AddStudentForm } from './AddStudentForm';
import { EditStudentForm } from './EditStudentForm';
import { StudentDetailModal } from './StudentDetailModal';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  CURRENT: 'success',
  COMPLETED: 'warning',
  CANCELLED: 'danger',
};

export function StudentsPage() {
  const [tab, setTab] = useState<'reports' | 'current' | 'completed' | 'cancelled' | 'add'>('reports');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [cancelStudent, setCancelStudent] = useState<Student | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    const params: Record<string, string | number> = { page, limit: 20 };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    else if (tab === 'current') params.status = 'CURRENT';
    else if (tab === 'cancelled') params.status = 'CANCELLED';
    else if (tab === 'completed') params.status = 'COMPLETED';
    if (courseFilter) params.courseId = courseFilter;
    try {
      const { data } = await api.get('/students', { params });
      setStudents(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, courseFilter, tab]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data.data || [])).catch(() => {});
    api.get('/faculty').then((r) => setFaculties(r.data.data || [])).catch(() => {});
  }, []);

  const handleCancel = async () => {
    if (!cancelStudent || !cancelReason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    setCancelLoading(true);
    try {
      await api.post(`/students/${cancelStudent.studentId}/cancel`, {
        reason: cancelReason,
        cancellationDate: new Date().toISOString(),
      });
      toast.success('Student registration cancelled');
      setCancelStudent(null);
      setCancelReason('');
      fetchStudents();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to cancel student');
    } finally {
      setCancelLoading(false);
    }
  };

  const columns = [
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
      header: 'Name',
      render: (s: Student) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {s.personalInfo?.name?.charAt(0) || 'S'}
          </div>
          <div>
            <p className="font-semibold text-white">{s.personalInfo?.name}</p>
            <p className="text-[11px] text-slate-400">{s.personalInfo?.mobile}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course & Modules',
      render: (s: Student) => (
        <div>
          <p className="text-slate-200 font-medium">{s.enrollment?.courseTitleSnapshot || 'Course'}</p>
          <p className="text-[11px] text-slate-400">
            {s.enrollment?.moduleSnapshots?.length || 0} module{(s.enrollment?.moduleSnapshots?.length || 0) !== 1 ? 's' : ''} enrolled
          </p>
        </div>
      ),
    },
    {
      key: 'faculty',
      header: 'Faculty',
      render: (s: Student) => (
        <span className="text-slate-300">{s.enrollment?.facultyNameSnapshot || '—'}</span>
      ),
    },
    {
      key: 'batch',
      header: 'Batch Schedule',
      render: (s: Student) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
          <span className="font-semibold text-indigo-300">{s.enrollment?.batchType}</span>
          <span className="text-slate-500">·</span>
          <span>{s.enrollment?.batchTime || 'Default slot'}</span>
        </span>
      ),
    },
    {
      key: 'fees',
      header: 'Fees',
      render: (s: Student) => (
        <div>
          <span className="font-semibold text-white">₹{s.fees?.courseFee?.toLocaleString() || 0}</span>
          <span className="text-[10px] text-slate-400 block">+ ₹{s.fees?.registrationFee || 100} Reg.</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: Student) => (
        <Badge variant={STATUS_COLORS[s.status] || 'default'} dot>
          {s.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s: Student) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewStudent(s)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
            title="View Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          {s.status !== 'CANCELLED' && (
            <button
              onClick={() => setEditStudent(s)}
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
              title="Edit Record"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {s.status === 'CURRENT' && (
            <button
              onClick={() => setCancelStudent(s)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Cancel Registration"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const tabs = [
    { key: 'reports', label: 'All Students' },
    { key: 'current', label: 'Active Students' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'add', label: '+ Register Student' },
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Student Management"
        subtitle="Comprehensive student registry, admissions, course progress, and status controls"
        actions={
          tab !== 'add' && (
            <Button
              variant="gradient"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setTab('add')}
            >
              Register New Student
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
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

      {tab === 'add' ? (
        <AddStudentForm
          courses={courses}
          faculties={faculties}
          onSuccess={() => {
            setTab('reports');
            fetchStudents();
          }}
        />
      ) : (
        <>
          {/* Filters Bar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by student name, ID, or mobile..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/70 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {tab === 'reports' && (
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs bg-slate-950/70 border border-white/10 text-white rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  <option value="" className="bg-slate-900">All Statuses</option>
                  <option value="CURRENT" className="bg-slate-900">Active (Current)</option>
                  <option value="COMPLETED" className="bg-slate-900">Completed</option>
                  <option value="CANCELLED" className="bg-slate-900">Cancelled</option>
                </select>
              )}

              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-auto px-3.5 py-2 text-xs bg-slate-950/70 border border-white/10 text-white rounded-xl focus:outline-none focus:border-indigo-500"
              >
                <option value="" className="bg-slate-900">All Courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id} className="bg-slate-900">
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Table */}
          {error ? (
            <ErrorMessage message={error} onRetry={fetchStudents} />
          ) : (
            <div className="space-y-4">
              <Table
                columns={columns}
                data={students}
                loading={loading}
                rowKey={(s) => s._id}
                emptyMessage="No students registered yet"
              />
              <Pagination page={page} total={total} limit={20} onPage={setPage} />
            </div>
          )}
        </>
      )}

      {/* View Detail Modal */}
      <StudentDetailModal student={viewStudent} onClose={() => setViewStudent(null)} />

      {/* Edit Student Modal */}
      {editStudent && (
        <EditStudentForm
          student={editStudent}
          courses={courses}
          faculties={faculties}
          onClose={() => setEditStudent(null)}
          onSuccess={() => {
            setEditStudent(null);
            fetchStudents();
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        open={!!cancelStudent}
        onClose={() => {
          setCancelStudent(null);
          setCancelReason('');
        }}
        title="Cancel Student Registration"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setCancelStudent(null);
                setCancelReason('');
              }}
            >
              Back
            </Button>
            <Button
              variant="danger"
              onClick={handleCancel}
              loading={cancelLoading}
              disabled={!cancelReason.trim()}
            >
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to cancel registration for{' '}
            <strong className="text-white">{cancelStudent?.personalInfo?.name}</strong> (
            <span className="font-mono text-indigo-400">{cancelStudent?.studentId}</span>)?
            All historical exams and fee records will be archived.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Cancellation Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="State clear justification for cancellation..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 resize-none h-24 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
