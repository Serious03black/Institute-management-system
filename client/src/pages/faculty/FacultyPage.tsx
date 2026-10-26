import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Eye, UserCheck, BookOpen, GraduationCap } from 'lucide-react';
import { PageHeader, Badge, Card, Spinner, ErrorMessage } from '../../components/ui/Cards';
import { Table, Pagination } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';
import type { Faculty, Course } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function FacultyPage() {
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [viewFaculty, setViewFaculty] = useState<Faculty | null>(null);
  const [editFaculty, setEditFaculty] = useState<Faculty | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: '',
    address: '',
    education: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    dateOfBirth: '',
    teachingCourseIds: [] as string[],
  });
  const [addLoading, setAddLoading] = useState(false);

  // Edit form state
  const [editReason, setEditReason] = useState('');
  const [editForm, setEditForm] = useState({ name: '', mobile: '', email: '', address: '' });
  const [editLoading, setEditLoading] = useState(false);

  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/faculty', {
        params: { page, limit: 20, search: search || undefined },
      });
      setFaculties(data.data || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load faculty');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data.data || [])).catch(() => {});
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.mobile || !addForm.education || !addForm.dateOfBirth) {
      toast.error('Please fill all required fields');
      return;
    }
    setAddLoading(true);
    try {
      const { data } = await api.post('/faculty', addForm);
      toast.success(`Faculty registered! ID: ${data.data.facultyId}`);
      setTab('list');
      fetchFaculties();
      setAddForm({
        name: '',
        address: '',
        education: '',
        mobile: '',
        alternateMobile: '',
        email: '',
        dateOfBirth: '',
        teachingCourseIds: [],
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to register faculty');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editFaculty || !editReason.trim()) {
      toast.error('Audit justification reason is required');
      return;
    }
    setEditLoading(true);
    try {
      await api.patch(`/faculty/${editFaculty.facultyId}`, { ...editForm, reason: editReason });
      toast.success('Faculty profile updated');
      setEditFaculty(null);
      setEditReason('');
      fetchFaculties();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update faculty');
    } finally {
      setEditLoading(false);
    }
  };

  const columns = [
    {
      key: 'facultyId',
      header: 'Faculty ID',
      render: (f: Faculty) => (
        <span className="font-mono text-indigo-400 font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          {f.facultyId}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Faculty Member',
      render: (f: Faculty) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {f.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-white">{f.name}</p>
            <p className="text-[11px] text-slate-400">{f.email || 'No email registered'}</p>
          </div>
        </div>
      ),
    },
    { key: 'mobile', header: 'Contact', render: (f: Faculty) => <span className="text-slate-300">{f.mobile}</span> },
    {
      key: 'education',
      header: 'Specialization',
      render: (f: Faculty) => (
        <span className="text-slate-200 font-medium">{f.education}</span>
      ),
    },
    {
      key: 'courses',
      header: 'Teaching Courses',
      render: (f: Faculty) => {
        const cList = (f.teachingCourseIds as Course[]) || [];
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {cList.map((c) => (
              <span key={c._id} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                {c.title}
              </span>
            ))}
            {cList.length === 0 && <span className="text-slate-500 text-xs">—</span>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (f: Faculty) => (
        <Badge variant={f.status === 'ACTIVE' ? 'success' : 'danger'} dot>
          {f.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (f: Faculty) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewFaculty(f)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditFaculty(f);
              setEditForm({ name: f.name, mobile: f.mobile, email: f.email || '', address: f.address });
            }}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
            title="Edit Faculty"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Faculty Management"
        subtitle="Manage faculty credentials, academic courses, and batch assignments"
        actions={
          <Button
            variant={tab === 'add' ? 'outline' : 'gradient'}
            size="sm"
            onClick={() => setTab(tab === 'add' ? 'list' : 'add')}
            icon={<Plus className="w-4 h-4" />}
          >
            {tab === 'add' ? 'Back to Faculty List' : 'Register New Faculty'}
          </Button>
        }
      />

      {tab === 'add' ? (
        <Card className="p-6">
          <div className="mb-6 pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-heading">Register New Faculty Member</h3>
            <p className="text-xs text-slate-400">Fill in faculty details and assign teaching courses</p>
          </div>
          <form onSubmit={handleAdd} className="space-y-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Full Name *"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Dr. / Prof. Jane Smith"
              />
              <Input
                label="Mobile *"
                value={addForm.mobile}
                onChange={(e) => setAddForm((f) => ({ ...f, mobile: e.target.value }))}
                placeholder="10-digit mobile number"
              />
              <Input
                label="Alternate Mobile"
                value={addForm.alternateMobile}
                onChange={(e) => setAddForm((f) => ({ ...f, alternateMobile: e.target.value }))}
                placeholder="Secondary contact"
              />
              <Input
                label="Email Address"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="faculty@institute.edu"
              />
              <Input
                label="Date of Birth *"
                type="date"
                value={addForm.dateOfBirth}
                onChange={(e) => setAddForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
              <Input
                label="Educational Qualification *"
                value={addForm.education}
                onChange={(e) => setAddForm((f) => ({ ...f, education: e.target.value }))}
                placeholder="e.g. Ph.D. CS, M.Tech"
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <Input
                  label="Residential Address *"
                  value={addForm.address}
                  onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Complete residential address"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Teaching Course Allocations</label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950/60 border border-white/10">
                {courses.filter((c) => c.status === 'ACTIVE').map((c) => (
                  <label
                    key={c._id}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={addForm.teachingCourseIds.includes(c._id)}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          teachingCourseIds: e.target.checked
                            ? [...f.teachingCourseIds, c._id]
                            : f.teachingCourseIds.filter((id) => id !== c._id),
                        }))
                      }
                      className="w-4 h-4 rounded text-indigo-500 bg-slate-900 border-white/20 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-slate-200">{c.title}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <Button type="button" variant="outline" onClick={() => setTab('list')}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" loading={addLoading}>
                Complete Faculty Registration
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search faculty by name or ID..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/70 border border-white/10 text-white placeholder-slate-500 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </Card>

          {error ? (
            <ErrorMessage message={error} onRetry={fetchFaculties} />
          ) : (
            <div className="space-y-4">
              <Table
                columns={columns}
                data={faculties}
                loading={loading}
                rowKey={(f) => f._id}
                emptyMessage="No faculty registered yet"
              />
              <Pagination page={page} total={total} limit={20} onPage={setPage} />
            </div>
          )}
        </>
      )}

      {/* View Faculty Modal */}
      <Modal open={!!viewFaculty} onClose={() => setViewFaculty(null)} title="Faculty Profile" size="md">
        {viewFaculty && (
          <div className="space-y-5">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md">
                {viewFaculty.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-white text-base font-heading">{viewFaculty.name}</p>
                <p className="font-mono text-indigo-400 text-xs font-semibold">{viewFaculty.facultyId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Mobile</p>
                <p className="text-white mt-0.5">{viewFaculty.mobile}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Alternate Contact</p>
                <p className="text-white mt-0.5">{viewFaculty.alternateMobile || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Email</p>
                <p className="text-white mt-0.5">{viewFaculty.email || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Date of Birth</p>
                <p className="text-white mt-0.5">{viewFaculty.dateOfBirth ? format(new Date(viewFaculty.dateOfBirth), 'dd MMM yyyy') : '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Qualification</p>
                <p className="text-white mt-0.5">{viewFaculty.education}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Assigned Courses</p>
              <div className="flex flex-wrap gap-1.5">
                {((viewFaculty.teachingCourseIds as Course[]) || []).map((c) => (
                  <span key={c._id} className="px-3 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium">
                    {c.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Faculty Modal */}
      <Modal
        open={!!editFaculty}
        onClose={() => {
          setEditFaculty(null);
          setEditReason('');
        }}
        title="Edit Faculty Record"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditFaculty(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={editLoading} disabled={!editReason.trim()}>
              Save Modifications
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            Notice: All changes are logged in the system audit trail with required reason justification.
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Mobile" value={editForm.mobile} onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))} />
            <Input label="Email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Address" value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Audit Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Reason for profile modification..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 h-20 resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
