import React, { useState, useEffect } from 'react';
import { Save, Upload, Eye, CheckCircle, AlertCircle, Sparkles, Sliders, Shield, User, FileSpreadsheet } from 'lucide-react';
import { PageHeader, Badge, Card, Spinner } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';
import type { AppSettings, QuestionBank, Course } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function SettingsPage() {
  const [tab, setTab] = useState<'general' | 'exam' | 'questionbank' | 'profile'>('general');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Institute & System Configuration"
        subtitle="Manage institute branding, examination policies, question banks, and admin security profile"
      />

      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-x-auto">
        {[
          { key: 'general', label: 'Institute Profile' },
          { key: 'exam', label: 'Exam Configuration' },
          { key: 'questionbank', label: 'Question Bank Hub' },
          { key: 'profile', label: 'Security & Profile' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
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

      {tab === 'general' && <GeneralSettings />}
      {tab === 'exam' && <ExamSettings />}
      {tab === 'questionbank' && <QuestionBankSettings />}
      {tab === 'profile' && <ProfileSettings />}
    </div>
  );
}

// ===== GENERAL SETTINGS =====
function GeneralSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [form, setForm] = useState({
    instituteName: '',
    instituteAddress: '',
    institutePhone: '',
    defaultRegistrationFee: 100,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get('/settings')
      .then((r) => {
        setSettings(r.data.data);
        setForm({
          instituteName: r.data.data.instituteName,
          instituteAddress: r.data.data.instituteAddress || '',
          institutePhone: r.data.data.institutePhone || '',
          defaultRegistrationFee: r.data.data.defaultRegistrationFee,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/settings', form);
      toast.success('Institute settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <Card className="p-6 max-w-2xl space-y-5">
      <div className="pb-3 border-b border-white/10">
        <h3 className="text-base font-bold text-white font-heading">Institute Profile & Defaults</h3>
        <p className="text-xs text-slate-400">Branding details appear on transcripts and receipts</p>
      </div>

      <div className="space-y-4">
        <Input
          label="Institute Name"
          value={form.instituteName}
          onChange={(e) => setForm((f) => ({ ...f, instituteName: e.target.value }))}
          placeholder="Institute Name..."
        />
        <Input
          label="Campus Address"
          value={form.instituteAddress}
          onChange={(e) => setForm((f) => ({ ...f, instituteAddress: e.target.value }))}
          placeholder="Complete physical address..."
        />
        <Input
          label="Contact Phone"
          value={form.institutePhone}
          onChange={(e) => setForm((f) => ({ ...f, institutePhone: e.target.value }))}
          placeholder="+1 (555) 000-0000"
        />
        <Input
          label="Default Registration Fee (₹)"
          type="number"
          value={form.defaultRegistrationFee}
          onChange={(e) =>
            setForm((f) => ({ ...f, defaultRegistrationFee: Number(e.target.value) }))
          }
        />
        <div className="pt-2">
          <Button
            onClick={handleSave}
            loading={saving}
            variant="gradient"
            icon={<Save className="w-4 h-4" />}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ===== EXAM SETTINGS =====
function ExamSettings() {
  const [form, setForm] = useState({
    durationMinutes: 60,
    passingMarks: 40,
    marksPerObjectiveQuestion: 2,
    practicalMaxMarks: 10,
    questionDistribution: { basic: 10, mid: 10, advanced: 20, practical: 2 },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get('/settings')
      .then((r) => {
        if (r.data.data?.exam) setForm(r.data.data.exam);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/settings', { exam: form });
      toast.success('Examination policies updated');
    } catch {
      toast.error('Failed to update exam settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5 max-w-2xl">
      <Card className="p-6 space-y-4">
        <div className="pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white font-heading">Exam Parameters & Thresholds</h3>
          <p className="text-xs text-slate-400">Define exam duration and passing score percentages</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Duration (minutes)"
            type="number"
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
          />
          <Input
            label="Passing Marks"
            type="number"
            value={form.passingMarks}
            onChange={(e) => setForm((f) => ({ ...f, passingMarks: Number(e.target.value) }))}
          />
          <Input
            label="Marks per Objective Question"
            type="number"
            value={form.marksPerObjectiveQuestion}
            onChange={(e) =>
              setForm((f) => ({ ...f, marksPerObjectiveQuestion: Number(e.target.value) }))
            }
          />
          <Input
            label="Practical Max Marks"
            type="number"
            value={form.practicalMaxMarks}
            onChange={(e) => setForm((f) => ({ ...f, practicalMaxMarks: Number(e.target.value) }))}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="pb-3 border-b border-white/10 mb-4">
          <h3 className="text-base font-bold text-white font-heading">Automated Question Distribution</h3>
          <p className="text-xs text-slate-400">Randomized question quotas pulled per student attempt</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['basic', 'mid', 'advanced', 'practical'] as const).map((s) => (
            <div key={s} className="p-4 rounded-xl bg-slate-950/70 border border-white/10 text-center">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {s}
              </p>
              <input
                type="number"
                value={form.questionDistribution[s]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    questionDistribution: {
                      ...f.questionDistribution,
                      [s]: Number(e.target.value),
                    },
                  }))
                }
                className="w-full text-center text-2xl font-extrabold text-indigo-400 bg-transparent border-0 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 text-right">
          Total per test:{' '}
          <strong className="text-white">
            {Object.values(form.questionDistribution).reduce((a, b) => a + b, 0)} questions
          </strong>
        </p>
      </Card>

      <Button
        onClick={handleSave}
        loading={saving}
        variant="gradient"
        icon={<Save className="w-4 h-4" />}
      >
        Save Exam Policies
      </Button>
    </div>
  );
}

// ===== QUESTION BANK SETTINGS =====
function QuestionBankSettings() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ counts: Record<string, number>; totalQuestions: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    api.get('/courses').then((r) => setCourses(r.data.data || [])).catch(() => {});
    api.get('/question-banks').then((r) => setBanks(r.data.data || [])).catch(() => {});
  }, []);

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);
  const courseModules = (selectedCourse?.moduleIds as { _id: string; moduleId: string; title: string }[]) || [];

  const handlePreview = async () => {
    if (!file || !selectedCourseId || !selectedModuleId) {
      toast.error('Select course, module, and file');
      return;
    }
    setPreviewLoading(true);
    setPreview(null);
    setConfirmed(false);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', selectedCourse?.courseId || '');
    formData.append('moduleId', courseModules.find((m) => m._id === selectedModuleId)?.moduleId || '');
    formData.append('preview', 'true');
    try {
      const { data } = await api.post('/question-banks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: string[] } } };
      const msg = err.response?.data?.errors?.join('\n') || err.response?.data?.message || 'Validation failed';
      toast.error(msg, { duration: 8000 });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedCourseId || !selectedModuleId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', selectedCourse?.courseId || '');
    formData.append('moduleId', courseModules.find((m) => m._id === selectedModuleId)?.moduleId || '');
    try {
      const { data } = await api.post('/question-banks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Question bank imported successfully!');
      setFile(null);
      setPreview(null);
      setConfirmed(false);
      api.get('/question-banks').then((r) => setBanks(r.data.data || [])).catch(() => {});
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: string[] } } };
      toast.error(err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Upload failed', {
        duration: 8000,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6 space-y-4">
        <div className="pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white font-heading">Import Excel Question Bank</h3>
          <p className="text-xs text-slate-400">
            Upload verified Excel spreadsheets containing Basic, Mid, Advanced, and Practical sections
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Select Course</label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setSelectedModuleId('');
              }}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="" className="bg-slate-900">-- Choose Academic Course --</option>
              {courses.filter((c) => c.status === 'ACTIVE').map((c) => (
                <option key={c._id} value={c._id} className="bg-slate-900">
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {selectedCourseId && (
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Target Module</label>
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="" className="bg-slate-900">-- Choose Module --</option>
                {courseModules.map((m) => (
                  <option key={m._id} value={m._id} className="bg-slate-900">
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Spreadsheet (.xlsx)</label>
          <div className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:border-indigo-500/50 transition-colors bg-white/[0.02]">
            <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-2 opacity-80" />
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
                setConfirmed(false);
              }}
              className="hidden"
              id="qb-file-settings"
            />
            <label htmlFor="qb-file-settings" className="cursor-pointer">
              {file ? (
                <span className="text-indigo-400 font-semibold text-xs">{file.name}</span>
              ) : (
                <span className="text-slate-400 text-xs">Click to browse Question Bank spreadsheet</span>
              )}
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            loading={previewLoading}
            disabled={!file || !selectedModuleId}
            icon={<Eye className="w-4 h-4" />}
          >
            Preview & Validate
          </Button>

          {preview && (
            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={!confirmed}
              variant="gradient"
              icon={<Upload className="w-4 h-4" />}
            >
              {confirmed ? 'Confirm & Activate Bank' : 'Select Confirmation'}
            </Button>
          )}
        </div>

        {preview && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-white text-xs">
                Verification Passed — {preview.totalQuestions} questions detected
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(preview.counts).map(([section, count]) => (
                <div key={section} className="p-3 rounded-xl bg-slate-950/80 text-center border border-emerald-500/20">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">{section}</p>
                  <p className="text-lg font-extrabold text-emerald-400">{count as number}</p>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/20"
              />
              <span className="text-xs text-slate-300">
                I verify these questions comply with institute standards and agree to activate this bank.
              </span>
            </label>
          </div>
        )}
      </Card>
    </div>
  );
}

// ===== PROFILE SETTINGS =====
function ProfileSettings() {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me').then((r) => {
      setProfile({ name: r.data.data?.profile?.name || '', email: r.data.data?.profile?.email || '' });
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/profile', profile);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await api.patch('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update password');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
      <Card className="p-6">
        <div className="pb-3 border-b border-white/10 mb-4">
          <h3 className="text-base font-bold text-white font-heading">Admin Profile</h3>
          <p className="text-xs text-slate-400">Update administrative contact information</p>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <Input
            label="Full Name"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Email Address"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
          />
          <Button type="submit" variant="gradient" loading={saving} icon={<Save className="w-4 h-4" />}>
            Save Profile
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="pb-3 border-b border-white/10 mb-4">
          <h3 className="text-base font-bold text-white font-heading">Security & Password</h3>
          <p className="text-xs text-slate-400">Update master admin credentials</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
          />
          <Button type="submit" variant="secondary" loading={pwSaving} icon={<Shield className="w-4 h-4" />}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
