import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Save, Upload, Eye, CheckCircle, AlertCircle, Sparkles, Sliders, Shield, User,
  FileSpreadsheet, Download, Search, Plus, Edit, Trash2, RefreshCw, Check, Layers,
  AlertTriangle, BookOpen, Code, HelpCircle, X, ChevronDown
} from 'lucide-react';
import { PageHeader, Badge, Card, Spinner } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';
import type { AppSettings, QuestionBank, Course, QuestionItem } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as 'general' | 'exam' | 'questionbank' | 'profile' | null;
  const [tab, setTab] = useState<'general' | 'exam' | 'questionbank' | 'profile'>(urlTab || 'general');

  const handleTabChange = (newTab: 'general' | 'exam' | 'questionbank' | 'profile') => {
    setTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', newTab);
    setSearchParams(newParams);
  };

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
            onClick={() => handleTabChange(t.key as typeof tab)}
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
      {tab === 'questionbank' && (
        <QuestionBankSettings
          initialBankId={searchParams.get('bankId') || undefined}
          initialModuleId={searchParams.get('moduleId') || undefined}
        />
      )}
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
interface QuestionBankSettingsProps {
  initialBankId?: string;
  initialModuleId?: string;
}

function QuestionBankSettings({ initialBankId, initialModuleId }: QuestionBankSettingsProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'browse' | 'upload'>('browse');

  // Question Banks & Course data
  const [courses, setCourses] = useState<Course[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Question Items for selected bank
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Question Modal State
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [editForm, setEditForm] = useState<{
    section: 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL';
    questionText: string;
    options: { A: string; B: string; C: string; D: string };
    correctOption: string;
    maximumMarks: number;
  }>({
    section: 'BASIC',
    questionText: '',
    options: { A: '', B: '', C: '', D: '' },
    correctOption: 'A',
    maximumMarks: 2,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Question Modal State
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [addForm, setAddForm] = useState<{
    section: 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL';
    questionText: string;
    options: { A: string; B: string; C: string; D: string };
    correctOption: string;
    maximumMarks: number;
  }>({
    section: 'BASIC',
    questionText: '',
    options: { A: '', B: '', C: '', D: '' },
    correctOption: 'A',
    maximumMarks: 2,
  });
  const [savingAdd, setSavingAdd] = useState(false);

  // Delete Question Modal State
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionItem | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Delete Entire Bank Confirmation
  const [confirmDeleteBank, setConfirmDeleteBank] = useState(false);
  const [deletingBankLoading, setDeletingBankLoading] = useState(false);

  // Upload Tab Form State
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [uploadModuleId, setUploadModuleId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{ counts: Record<string, number>; totalQuestions: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch courses and question banks on mount
  const fetchBanks = async (selectTargetId?: string) => {
    setLoadingBanks(true);
    try {
      const [coursesRes, banksRes] = await Promise.all([
        api.get('/courses'),
        api.get('/question-banks'),
      ]);
      setCourses(coursesRes.data.data || []);
      const bankList: QuestionBank[] = banksRes.data.data || [];
      setBanks(bankList);

      // Determine initial bank selection
      if (selectTargetId) {
        setSelectedBankId(selectTargetId);
      } else if (initialBankId && bankList.some((b) => b._id === initialBankId)) {
        setSelectedBankId(initialBankId);
      } else if (initialModuleId) {
        const found = bankList.find(
          (b) =>
            (b.moduleId as unknown as { moduleId?: string })?.moduleId === initialModuleId ||
            (b.moduleId as unknown as { _id?: string })?._id === initialModuleId
        );
        if (found) setSelectedBankId(found._id);
        else if (bankList.length > 0 && !selectedBankId) setSelectedBankId(bankList[0]._id);
      } else if (bankList.length > 0 && !selectedBankId) {
        setSelectedBankId(bankList[0]._id);
      }
    } catch {
      toast.error('Failed to load courses or question banks');
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  // Fetch questions whenever selectedBankId changes
  const fetchQuestions = async (bankId: string) => {
    if (!bankId) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    try {
      const res = await api.get(`/question-banks/${bankId}/questions`);
      setQuestions(res.data.data || []);
    } catch {
      toast.error('Failed to load questions for selected bank');
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (selectedBankId) {
      fetchQuestions(selectedBankId);
    } else {
      setQuestions([]);
    }
  }, [selectedBankId]);

  // Selected bank metadata
  const selectedBank = banks.find((b) => b._id === selectedBankId);
  const selectedBankCourseTitle =
    (selectedBank?.courseId as unknown as { title?: string })?.title || 'Course';
  const selectedBankModuleTitle =
    (selectedBank?.moduleId as unknown as { title?: string })?.title || 'Module';

  // Section Counts calculation
  const basicCount = questions.filter((q) => q.section === 'BASIC').length;
  const midCount = questions.filter((q) => q.section === 'MID').length;
  const advCount = questions.filter((q) => q.section === 'ADVANCED').length;
  const pracCount = questions.filter((q) => q.section === 'PRACTICAL').length;

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSection = sectionFilter === 'ALL' || q.section === sectionFilter;
      const qText = (q.questionText || '').toLowerCase();
      const sQuery = searchQuery.trim().toLowerCase();
      const matchSearch =
        !sQuery ||
        qText.includes(sQuery) ||
        (q.options && Object.values(q.options).some((o) => o?.toLowerCase().includes(sQuery))) ||
        String(q.questionNumber).includes(sQuery);
      return matchSection && matchSearch;
    });
  }, [questions, sectionFilter, searchQuery]);

  // Open Edit Modal
  const handleOpenEdit = (q: QuestionItem) => {
    setEditingQuestion(q);
    setEditForm({
      section: q.section,
      questionText: q.questionText,
      options: {
        A: q.options?.A || '',
        B: q.options?.B || '',
        C: q.options?.C || '',
        D: q.options?.D || '',
      },
      correctOption: q.correctOption || 'A',
      maximumMarks: q.maximumMarks || (q.section === 'PRACTICAL' ? 5 : 2),
    });
  };

  // Submit Edit Question
  const handleSaveEdit = async () => {
    if (!editingQuestion) return;
    if (!editForm.questionText.trim()) {
      toast.error('Question prompt text cannot be empty');
      return;
    }
    if (editForm.section !== 'PRACTICAL') {
      if (!editForm.options.A || !editForm.options.B || !editForm.options.C || !editForm.options.D) {
        toast.error('All 4 options (A, B, C, D) are required for objective questions');
        return;
      }
      if (!editForm.correctOption) {
        toast.error('Please specify the correct answer option');
        return;
      }
    }
    setSavingEdit(true);
    try {
      await api.put(`/question-banks/questions/${editingQuestion._id}`, {
        section: editForm.section,
        questionText: editForm.questionText.trim(),
        options: editForm.section !== 'PRACTICAL' ? editForm.options : undefined,
        correctOption: editForm.section !== 'PRACTICAL' ? editForm.correctOption : undefined,
        maximumMarks: editForm.maximumMarks,
      });
      toast.success('Question updated successfully!');
      setEditingQuestion(null);
      if (selectedBankId) {
        fetchQuestions(selectedBankId);
        fetchBanks(selectedBankId);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update question');
    } finally {
      setSavingEdit(false);
    }
  };

  // Submit Delete Question
  const handleDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    setDeletingLoading(true);
    try {
      await api.delete(`/question-banks/questions/${deletingQuestion._id}`);
      toast.success('Question deleted successfully!');
      setDeletingQuestion(null);
      if (selectedBankId) {
        fetchQuestions(selectedBankId);
        fetchBanks(selectedBankId);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete question');
    } finally {
      setDeletingLoading(false);
    }
  };

  // Submit Add Question
  const handleSaveAdd = async () => {
    if (!selectedBankId) return;
    if (!addForm.questionText.trim()) {
      toast.error('Question text is required');
      return;
    }
    if (addForm.section !== 'PRACTICAL') {
      if (!addForm.options.A || !addForm.options.B || !addForm.options.C || !addForm.options.D) {
        toast.error('All 4 options (A, B, C, D) are required');
        return;
      }
      if (!addForm.correctOption) {
        toast.error('Please choose the correct option');
        return;
      }
    }
    setSavingAdd(true);
    try {
      await api.post(`/question-banks/${selectedBankId}/questions`, {
        section: addForm.section,
        questionText: addForm.questionText.trim(),
        options: addForm.section !== 'PRACTICAL' ? addForm.options : undefined,
        correctOption: addForm.section !== 'PRACTICAL' ? addForm.correctOption : undefined,
        maximumMarks: addForm.maximumMarks,
      });
      toast.success('New question added successfully!');
      setIsAddingQuestion(false);
      setAddForm({
        section: 'BASIC',
        questionText: '',
        options: { A: '', B: '', C: '', D: '' },
        correctOption: 'A',
        maximumMarks: 2,
      });
      fetchQuestions(selectedBankId);
      fetchBanks(selectedBankId);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to add question');
    } finally {
      setSavingAdd(false);
    }
  };

  // Submit Delete Question Bank
  const handleDeleteBank = async () => {
    if (!selectedBankId) return;
    setDeletingBankLoading(true);
    try {
      await api.delete(`/question-banks/${selectedBankId}`);
      toast.success('Question bank and all associated questions deleted');
      setConfirmDeleteBank(false);
      setSelectedBankId('');
      fetchBanks();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete question bank');
    } finally {
      setDeletingBankLoading(false);
    }
  };

  // Handle Excel Upload Preview
  const selectedUploadCourse = courses.find((c) => c._id === uploadCourseId);
  const uploadCourseModules =
    (selectedUploadCourse?.moduleIds as { _id: string; moduleId: string; title: string }[]) || [];

  const handlePreviewUpload = async () => {
    if (!file || !uploadCourseId || !uploadModuleId) {
      toast.error('Select course, module, and file');
      return;
    }
    setPreviewLoading(true);
    setPreview(null);
    setConfirmed(false);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', selectedUploadCourse?.courseId || '');
    formData.append(
      'moduleId',
      uploadCourseModules.find((m) => m._id === uploadModuleId)?.moduleId || ''
    );
    formData.append('preview', 'true');
    try {
      const { data } = await api.post('/question-banks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: string[] } } };
      const msg =
        err.response?.data?.errors?.join('\n') ||
        err.response?.data?.message ||
        'Validation failed';
      toast.error(msg, { duration: 8000 });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUploadConfirm = async () => {
    if (!file || !uploadCourseId || !uploadModuleId) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', selectedUploadCourse?.courseId || '');
    formData.append(
      'moduleId',
      uploadCourseModules.find((m) => m._id === uploadModuleId)?.moduleId || ''
    );
    try {
      const { data } = await api.post('/question-banks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Question bank imported & activated successfully!');
      setFile(null);
      setPreview(null);
      setConfirmed(false);
      setActiveTab('browse');
      const newBankId = data.data?.bankId;
      fetchBanks(newBankId);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; errors?: string[] } } };
      toast.error(
        err.response?.data?.errors?.join(', ') || err.response?.data?.message || 'Upload failed',
        { duration: 8000 }
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Browse & Manage Questions</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Import Excel Spreadsheet</span>
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.open('/api/v1/question-banks/template', '_blank')}
          icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
        >
          Download Excel Template
        </Button>
      </div>

      {/* TAB 1: BROWSE & MANAGE QUESTIONS */}
      {activeTab === 'browse' && (
        <div className="space-y-5">
          {/* Question Bank Selection Dropdown Card */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Select Question Bank:</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {banks.length} bank{banks.length !== 1 ? 's' : ''} available in database
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-slate-950/80 border border-white/15 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer shadow-inner appearance-none pr-10"
                >
                  <option value="" className="bg-slate-900 text-slate-400">
                    -- Choose Question Bank from Dropdown --
                  </option>
                  {banks.map((b) => {
                    const cTitle =
                      (b.courseId as unknown as { title?: string })?.title || 'Unknown Course';
                    const mTitle =
                      (b.moduleId as unknown as { title?: string })?.title || 'Unknown Module';
                    const total =
                      (b.sectionCounts?.basic || 0) +
                      (b.sectionCounts?.mid || 0) +
                      (b.sectionCounts?.advanced || 0) +
                      (b.sectionCounts?.practical || 0);
                    return (
                      <option key={b._id} value={b._id} className="bg-slate-900 text-white py-1">
                        {cTitle} » {mTitle} (v{b.version} • {total} Questions) [{b.status}]
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {selectedBankId && (
                <div className="flex gap-2">
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => {
                      setAddForm({
                        section: 'BASIC',
                        questionText: '',
                        options: { A: '', B: '', C: '', D: '' },
                        correctOption: 'A',
                        maximumMarks: 2,
                      });
                      setIsAddingQuestion(true);
                    }}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Question
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchQuestions(selectedBankId);
                      fetchBanks(selectedBankId);
                    }}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    title="Reload Questions"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDeleteBank(true)}
                    icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                    className="hover:border-rose-500/50 hover:bg-rose-500/10"
                    title="Delete Question Bank"
                  />
                </div>
              )}
            </div>

            {/* Selected Bank Metadata Banner */}
            {selectedBank && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 bg-white/[0.01] rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">
                      {selectedBankCourseTitle} <span className="text-slate-500">/</span> {selectedBankModuleTitle}
                    </h4>
                    <span className="font-mono text-[10px] text-indigo-300 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 font-semibold">
                      v{selectedBank.version}
                    </span>
                    <Badge variant={selectedBank.status === 'ACTIVE' ? 'success' : 'default'} dot>
                      {selectedBank.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Source: <span className="text-slate-300 font-mono">{selectedBank.sourceFileName || 'System Imported'}</span> · Uploaded on{' '}
                    {format(new Date(selectedBank.uploadedAt || Date.now()), 'MMM dd, yyyy')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/10 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                    <span className="text-xs font-extrabold text-white">{questions.length}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-400 block">Basic</span>
                    <span className="text-xs font-extrabold text-blue-300">{basicCount}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">Mid</span>
                    <span className="text-xs font-extrabold text-amber-300">{midCount}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-400 block">Adv</span>
                    <span className="text-xs font-extrabold text-purple-300">{advCount}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Prac</span>
                    <span className="text-xs font-extrabold text-emerald-300">{pracCount}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* If No Bank is Selected */}
          {!selectedBankId && (
            <Card className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">No Question Bank Selected</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select a curriculum module from the dropdown above to view, modify, delete, or add questions.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('upload')}>
                  Import a New Question Bank
                </Button>
              </div>
            </Card>
          )}

          {/* When a Bank is Selected */}
          {selectedBankId && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Section filter pills */}
                <div className="flex gap-1.5 p-1 rounded-xl bg-slate-900/70 border border-white/10 overflow-x-auto w-full sm:w-auto">
                  {(
                    [
                      { key: 'ALL', label: 'All', count: questions.length },
                      { key: 'BASIC', label: 'Basic', count: basicCount },
                      { key: 'MID', label: 'Mid', count: midCount },
                      { key: 'ADVANCED', label: 'Advanced', count: advCount },
                      { key: 'PRACTICAL', label: 'Practical', count: pracCount },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSectionFilter(s.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                        sectionFilter === s.key
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <span>{s.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          sectionFilter === s.key
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {s.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search question text or options..."
                    className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Questions List */}
              {loadingQuestions ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3">
                  <Spinner size="lg" />
                  <p className="text-xs text-slate-400 font-medium">Loading questions from database...</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <Card className="p-12 text-center space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-white">No questions found</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {searchQuery
                      ? 'No questions matched your current search criteria. Try modifying your filter.'
                      : 'No questions in this section yet. Click "+ Add Question" to create one.'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-3.5">
                  {filteredQuestions.map((q) => {
                    const sectionColors = {
                      BASIC: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      MID: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      ADVANCED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                      PRACTICAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    };

                    return (
                      <Card
                        key={q._id}
                        className="p-5 border border-white/10 hover:border-indigo-500/30 transition-all duration-200"
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded-lg bg-white/10 border border-white/10">
                              Q#{q.questionNumber}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                sectionColors[q.section] || 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {q.section} SECTION
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {q.maximumMarks} Mark{q.maximumMarks !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Action Buttons: Edit and Delete */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleOpenEdit(q)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/20 flex items-center gap-1.5 transition-all"
                              title="Edit Question"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setDeletingQuestion(q)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 flex items-center gap-1.5 transition-all"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Question Prompt */}
                        <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed mt-3 whitespace-pre-wrap">
                          {q.questionText}
                        </p>

                        {/* Options Display (for Objective Questions) */}
                        {q.section !== 'PRACTICAL' && q.options && (
                          <div className="grid sm:grid-cols-2 gap-2.5 mt-3.5 pt-3 border-t border-white/5">
                            {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                              const isCorrect = q.correctOption === optKey;
                              const optVal = q.options?.[optKey];
                              return (
                                <div
                                  key={optKey}
                                  className={`px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 transition-all border ${
                                    isCorrect
                                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 shadow-sm shadow-emerald-500/10'
                                      : 'bg-slate-950/60 border-white/5 text-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                                      isCorrect
                                        ? 'bg-emerald-500 text-slate-950 shadow'
                                        : 'bg-white/10 text-slate-400'
                                    }`}
                                  >
                                    {isCorrect ? <Check className="w-3 h-3 stroke-[3]" /> : optKey}
                                  </span>
                                  <span className="flex-1 break-words leading-relaxed">
                                    {optVal || `(Option ${optKey} empty)`}
                                  </span>
                                  {isCorrect && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Practical Task Prompt Display */}
                        {q.section === 'PRACTICAL' && (
                          <div className="mt-3.5 p-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 flex items-start gap-2.5">
                            <Code className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-slate-300">
                              <span className="font-semibold text-emerald-300">Practical Coding Scenario: </span>
                              Students are presented with an interactive code editor during the exam to complete and execute this solution.
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: IMPORT EXCEL SPREADSHEET */}
      {activeTab === 'upload' && (
        <Card className="p-6 space-y-4 max-w-3xl">
          <div className="pb-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-heading">Import Excel Question Bank</h3>
              <p className="text-xs text-slate-400">
                Upload verified Excel spreadsheets containing Basic, Mid, Advanced, and Practical sections
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/v1/question-banks/template', '_blank')}
              icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            >
              Download Sample Template (.xlsx)
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Select Course</label>
              <select
                value={uploadCourseId}
                onChange={(e) => {
                  setUploadCourseId(e.target.value);
                  setUploadModuleId('');
                }}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="" className="bg-slate-900">-- Choose Academic Course --</option>
                {courses
                  .filter((c) => c.status === 'ACTIVE')
                  .map((c) => (
                    <option key={c._id} value={c._id} className="bg-slate-900">
                      {c.title}
                    </option>
                  ))}
              </select>
            </div>

            {uploadCourseId && (
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Target Module</label>
                <select
                  value={uploadModuleId}
                  onChange={(e) => setUploadModuleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="" className="bg-slate-900">-- Choose Module --</option>
                  {uploadCourseModules.map((m) => (
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
              onClick={handlePreviewUpload}
              loading={previewLoading}
              disabled={!file || !uploadModuleId}
              icon={<Eye className="w-4 h-4" />}
            >
              Preview & Validate
            </Button>

            {preview && (
              <Button
                onClick={handleUploadConfirm}
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
                  <div
                    key={section}
                    className="p-3 rounded-xl bg-slate-950/80 text-center border border-emerald-500/20"
                  >
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
      )}

      {/* MODAL: EDIT QUESTION */}
      <Modal
        open={!!editingQuestion}
        onClose={() => setEditingQuestion(null)}
        title={editingQuestion ? `Edit Question #${editingQuestion.questionNumber}` : 'Edit Question'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingQuestion(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSaveEdit} loading={savingEdit} icon={<Save className="w-4 h-4" />}>
              Save Modifications
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Section Category</label>
              <select
                value={editForm.section}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    section: e.target.value as 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL',
                    maximumMarks: e.target.value === 'PRACTICAL' ? 5 : 2,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="BASIC" className="bg-slate-900">BASIC SECTION (Fundamentals)</option>
                <option value="MID" className="bg-slate-900">MID SECTION (Intermediate)</option>
                <option value="ADVANCED" className="bg-slate-900">ADVANCED SECTION (Complex)</option>
                <option value="PRACTICAL" className="bg-slate-900">PRACTICAL SECTION (Coding / Lab)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Maximum Marks</label>
              <input
                type="number"
                min="1"
                max="50"
                value={editForm.maximumMarks}
                onChange={(e) => setEditForm((f) => ({ ...f, maximumMarks: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Question Statement / Prompt <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={editForm.questionText}
              onChange={(e) => setEditForm((f) => ({ ...f, questionText: e.target.value }))}
              placeholder="Enter comprehensive question description..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>

          {editForm.section !== 'PRACTICAL' && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <label className="text-xs font-bold text-white block">Multiple Choice Options (A, B, C, D)</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div key={opt} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Option {opt}</span>
                    <input
                      type="text"
                      value={editForm.options[opt]}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          options: { ...f.options, [opt]: e.target.value },
                        }))
                      }
                      placeholder={`Enter text for Option ${opt}...`}
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Designate Correct Answer <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const isSelected = editForm.correctOption === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, correctOption: opt }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-950/70 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>Option {opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: ADD NEW QUESTION */}
      <Modal
        open={isAddingQuestion}
        onClose={() => setIsAddingQuestion(false)}
        title={`Add Question to ${selectedBankModuleTitle}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddingQuestion(false)} disabled={savingAdd}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSaveAdd} loading={savingAdd} icon={<Plus className="w-4 h-4" />}>
              Add Question
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Section Category</label>
              <select
                value={addForm.section}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    section: e.target.value as 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL',
                    maximumMarks: e.target.value === 'PRACTICAL' ? 5 : 2,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="BASIC" className="bg-slate-900">BASIC SECTION (Fundamentals)</option>
                <option value="MID" className="bg-slate-900">MID SECTION (Intermediate)</option>
                <option value="ADVANCED" className="bg-slate-900">ADVANCED SECTION (Complex)</option>
                <option value="PRACTICAL" className="bg-slate-900">PRACTICAL SECTION (Coding / Lab)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Maximum Marks</label>
              <input
                type="number"
                min="1"
                max="50"
                value={addForm.maximumMarks}
                onChange={(e) => setAddForm((f) => ({ ...f, maximumMarks: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950/70 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Question Statement / Prompt <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={addForm.questionText}
              onChange={(e) => setAddForm((f) => ({ ...f, questionText: e.target.value }))}
              placeholder="Enter comprehensive question description..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>

          {addForm.section !== 'PRACTICAL' && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <label className="text-xs font-bold text-white block">Multiple Choice Options (A, B, C, D)</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                  <div key={opt} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">Option {opt}</span>
                    <input
                      type="text"
                      value={addForm.options[opt]}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          options: { ...f.options, [opt]: e.target.value },
                        }))
                      }
                      placeholder={`Enter text for Option ${opt}...`}
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Designate Correct Answer <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const isSelected = addForm.correctOption === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAddForm((f) => ({ ...f, correctOption: opt }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-950/70 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        <span>Option {opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: DELETE QUESTION CONFIRMATION */}
      <Modal
        open={!!deletingQuestion}
        onClose={() => setDeletingQuestion(null)}
        title="Confirm Question Deletion"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingQuestion(null)} disabled={deletingLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteQuestion}
              loading={deletingLoading}
              className="bg-rose-600 hover:bg-rose-500 text-white"
              icon={<Trash2 className="w-4 h-4" />}
            >
              Delete Question
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>This question will be permanently removed from this question bank.</span>
          </div>
          {deletingQuestion && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] font-bold text-slate-400">
                Question #{deletingQuestion.questionNumber} ({deletingQuestion.section}):
              </span>
              <p className="text-xs text-white line-clamp-3 italic">
                "{deletingQuestion.questionText}"
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: DELETE ENTIRE QUESTION BANK CONFIRMATION */}
      <Modal
        open={confirmDeleteBank}
        onClose={() => setConfirmDeleteBank(false)}
        title="Delete Entire Question Bank?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDeleteBank(false)} disabled={deletingBankLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteBank}
              loading={deletingBankLoading}
              className="bg-rose-600 hover:bg-rose-500 text-white"
              icon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Bank Deletion
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>
              Warning: Deleting this question bank will erase all {questions.length} questions associated with{' '}
              <strong>{selectedBankModuleTitle}</strong>.
            </span>
          </div>
          <p className="text-xs text-slate-400">
            This action cannot be undone. You will need to re-upload or generate a new question bank for students taking exams on this module.
          </p>
        </div>
      </Modal>
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
