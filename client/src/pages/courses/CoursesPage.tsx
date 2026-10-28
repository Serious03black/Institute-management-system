import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, BookOpen, Edit, ChevronDown, ChevronUp, FileSpreadsheet,
  UploadCloud, CheckCircle, AlertCircle, Layers, Check, Download, Sparkles, AlertTriangle, Eye
} from 'lucide-react';
import { PageHeader, Badge, Card, Spinner, ErrorMessage } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';
import type { Course, Module } from '../../types';
import toast from 'react-hot-toast';

export function CoursesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  // Add course form
  const [addTitle, setAddTitle] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addModules, setAddModules] = useState<string[]>(['']);
  const [addLoading, setAddLoading] = useState(false);

  // Edit course
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Add module to existing course
  const [addModuleCourse, setAddModuleCourse] = useState<Course | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addModuleLoading, setAddModuleLoading] = useState(false);

  // Question Bank Upload Modal
  const [qbModal, setQbModal] = useState<{ course: Course; module: Module } | null>(null);
  const [qbFile, setQbFile] = useState<File | null>(null);
  const [qbUploading, setQbUploading] = useState(false);
  const [qbResult, setQbResult] = useState<any>(null);
  const [qbErrors, setQbErrors] = useState<string[]>([]);
  const [autoGenLoading, setAutoGenLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/courses');
      const list = data.data || [];
      setCourses(list);
      if (list.length > 0 && !expandedCourse) {
        setExpandedCourse(list[0]._id);
      }
    } catch {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim()) {
      toast.error('Course title required');
      return;
    }
    setAddLoading(true);
    try {
      await api.post('/courses', {
        title: addTitle.trim(),
        description: addDesc.trim(),
        modules: addModules.filter((m) => m.trim()),
      });
      toast.success('Course created successfully');
      setTab('list');
      fetchCourses();
      setAddTitle('');
      setAddDesc('');
      setAddModules(['']);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to create course');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditCourse = async () => {
    if (!editCourse || !editTitle.trim() || !editReason.trim()) {
      toast.error('Title and audit reason are required');
      return;
    }
    setEditLoading(true);
    try {
      await api.patch(`/courses/${editCourse.courseId}`, {
        title: editTitle,
        reason: editReason,
      });
      toast.success('Course updated');
      setEditCourse(null);
      setEditReason('');
      fetchCourses();
    } catch {
      toast.error('Failed to update course');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddModule = async () => {
    if (!addModuleCourse || !newModuleTitle.trim()) {
      toast.error('Module title required');
      return;
    }
    setAddModuleLoading(true);
    try {
      await api.post(`/courses/${addModuleCourse.courseId}/modules`, {
        title: newModuleTitle.trim(),
      });
      toast.success('Module added');
      setAddModuleCourse(null);
      setNewModuleTitle('');
      fetchCourses();
    } catch {
      toast.error('Failed to add module');
    } finally {
      setAddModuleLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/v1/question-banks/template', '_blank');
  };

  const handleAutoGenerate = async () => {
    if (!qbModal) return;
    setAutoGenLoading(true);
    setQbErrors([]);
    try {
      const { data } = await api.post('/question-banks/auto-generate', {
        courseId: qbModal.course.courseId,
        moduleId: qbModal.module.moduleId,
      });
      toast.success(data.message || 'Question bank generated successfully!');
      setQbResult(data.data);
      fetchCourses();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to auto-generate questions');
    } finally {
      setAutoGenLoading(false);
    }
  };

  const handleQbUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qbModal || !qbFile) {
      toast.error('Please select an Excel (.xlsx) question bank file');
      return;
    }
    setQbUploading(true);
    setQbResult(null);
    setQbErrors([]);
    try {
      const formData = new FormData();
      formData.append('file', qbFile);
      formData.append('courseId', qbModal.course.courseId);
      formData.append('moduleId', qbModal.module.moduleId);

      const { data } = await api.post('/question-banks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(data.message || 'Question bank uploaded & verified successfully!');
      setQbResult(data.data);
      fetchCourses();
    } catch (e: any) {
      const res = e.response?.data;
      if (res?.errors && Array.isArray(res.errors)) {
        setQbErrors(res.errors);
      }
      toast.error(res?.message || 'Failed to upload question bank');
    } finally {
      setQbUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Courses & Academic Curriculum"
        subtitle="Configure courses, module progression, and automated Excel question banks"
        actions={
          <Button
            variant={tab === 'add' ? 'outline' : 'gradient'}
            size="sm"
            onClick={() => setTab(tab === 'add' ? 'list' : 'add')}
            icon={<Plus className="w-4 h-4" />}
          >
            {tab === 'add' ? 'Back to Courses' : 'Create New Course'}
          </Button>
        }
      />

      {tab === 'add' ? (
        <Card className="p-6">
          <div className="mb-6 pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white font-heading">Create New Academic Course</h3>
            <p className="text-xs text-slate-400">Define course title, description, and initial learning modules</p>
          </div>
          <form onSubmit={handleAddCourse} className="space-y-5">
            <Input
              label="Course Title *"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="e.g. Full Stack Web Development"
            />
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Course Description</label>
              <textarea
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                placeholder="Comprehensive description of topics, syllabus, and prerequisites..."
                className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 h-24 resize-none focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">Initial Course Modules</label>
                <button
                  type="button"
                  onClick={() => setAddModules((ms) => [...ms, ''])}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  + Add Another Module
                </button>
              </div>
              <div className="space-y-2">
                {addModules.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={m}
                      onChange={(e) =>
                        setAddModules((ms) => ms.map((v, j) => (j === i ? e.target.value : v)))
                      }
                      placeholder={`Module ${i + 1} Title (e.g. JavaScript & Async Patterns)`}
                      className="flex-1 bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    {addModules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAddModules((ms) => ms.filter((_, j) => j !== i))}
                        className="px-3 rounded-xl bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/5 text-xs transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <Button type="button" variant="outline" onClick={() => setTab('list')}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" loading={addLoading}>
                Publish Course
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchCourses} />
          ) : (
            <div className="space-y-4">
              {courses.length === 0 ? (
                <div className="text-center py-16 text-slate-400 rounded-2xl bg-white/[0.02] border border-white/5">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                  <p className="font-medium text-white">No Courses Configured</p>
                  <p className="text-xs text-slate-500 mt-1">Get started by creating your first course catalog item</p>
                </div>
              ) : (
                courses.map((course) => (
                  <Card key={course._id} className="overflow-hidden">
                    {/* Course Card Header */}
                    <div
                      className="flex items-center gap-4 p-5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                      onClick={() =>
                        setExpandedCourse(expandedCourse === course._id ? null : course._id)
                      }
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-indigo-600/30">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-white text-base font-heading">{course.title}</h3>
                          <span className="font-mono text-xs text-indigo-400 font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            {course.courseId}
                          </span>
                          <Badge variant={course.status === 'ACTIVE' ? 'success' : 'default'} dot>
                            {course.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {(course.moduleIds as Module[]).length} module{(course.moduleIds as Module[]).length !== 1 ? 's' : ''} structured · {course.enrolledStudents || 0} student{(course.enrolledStudents || 0) !== 1 ? 's' : ''} actively enrolled
                        </p>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditCourse(course);
                            setEditTitle(course.title);
                          }}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors"
                          title="Edit Course Name"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setExpandedCourse(expandedCourse === course._id ? null : course._id)
                          }
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                          {expandedCourse === course._id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Course Expandable Modules Drawer */}
                    {expandedCourse === course._id && (
                      <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-slate-950/40 space-y-4">
                        {course.description && (
                          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                            {course.description}
                          </p>
                        )}

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                              Curriculum Modules ({(course.moduleIds as Module[]).length})
                            </h4>
                            <button
                              onClick={() => setAddModuleCourse(course)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Module</span>
                            </button>
                          </div>

                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(course.moduleIds as Module[]).map((mod, idx) => (
                              <div
                                key={mod._id}
                                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between gap-3 group"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-mono text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                                      {mod.moduleId}
                                    </span>
                                    <Badge variant={mod.status === 'ACTIVE' ? 'success' : 'default'} dot>
                                      {mod.status}
                                    </Badge>
                                  </div>
                                  <p className="font-semibold text-white text-xs leading-snug">
                                    {mod.title}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => {
                                      setQbModal({ course, module: mod });
                                      setQbFile(null);
                                      setQbResult(null);
                                    }}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Upload Bank</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigate(`/settings?tab=questionbank&moduleId=${mod.moduleId}`);
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                                    title="View and Edit questions in Question Bank Hub"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>View Questions</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Course Modal */}
      <Modal
        open={!!editCourse}
        onClose={() => {
          setEditCourse(null);
          setEditReason('');
        }}
        title="Edit Course Title"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditCourse(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditCourse} loading={editLoading} disabled={!editReason.trim()}>
              Save Modifications
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Course Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Audit Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Justification for modifying course title..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 h-20 resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </Modal>

      {/* Add Module Modal */}
      <Modal
        open={!!addModuleCourse}
        onClose={() => {
          setAddModuleCourse(null);
          setNewModuleTitle('');
        }}
        title={`Add Module — ${addModuleCourse?.title}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddModuleCourse(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddModule}
              loading={addModuleLoading}
              disabled={!newModuleTitle.trim()}
            >
              Add Module
            </Button>
          </>
        }
      >
        <Input
          label="Module Title *"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          placeholder="e.g. Asynchronous Architecture & Microservices"
          autoFocus
        />
      </Modal>

      {/* Question Bank Upload Modal */}
      <Modal
        open={!!qbModal}
        onClose={() => {
          setQbModal(null);
          setQbFile(null);
          setQbResult(null);
          setQbErrors([]);
        }}
        title={`Question Bank Hub — ${qbModal?.module?.title}`}
        size="lg"
      >
        <div className="space-y-5">
          {/* Action Helper Banner */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Quick Question Bank Setup
                </p>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Every module requires questions across 4 categories: <strong className="text-white">Basic</strong> (10 Qs), <strong className="text-white">Mid</strong> (10 Qs), <strong className="text-white">Advanced</strong> (20 Qs), and <strong className="text-white">Practical</strong> (2+ Qs).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
              >
                Download Sample Excel Template (.xlsx)
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAutoGenerate}
                loading={autoGenLoading}
                icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
              >
                Auto-Generate 44 Questions (Instant)
              </Button>
            </div>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleQbUpload} className="space-y-4">
            <div className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:border-indigo-500/50 transition-colors bg-white/[0.02]">
              <UploadCloud className="w-10 h-10 mx-auto text-indigo-400 mb-2 opacity-80" />
              <p className="text-xs font-semibold text-white">Upload Custom Question Bank Spreadsheet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Supports .xlsx or .xls with Basic, Mid, Advanced, Practical sheets</p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  setQbFile(e.target.files?.[0] || null);
                  setQbErrors([]);
                  setQbResult(null);
                }}
                className="mt-4 block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
              />
            </div>

            {qbFile && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Selected: <strong>{qbFile.name}</strong> ({(qbFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}

            {/* Validation Errors List */}
            {qbErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2">
                <p className="font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Please fix the following issues in your Excel file:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 max-h-40 overflow-y-auto">
                  {qbErrors.map((err, idx) => (
                    <li key={idx} className="font-mono text-[11px]">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {qbResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5">
                <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Import Successful & Questions Verified!
                </p>
                <p className="text-slate-300">
                  Version: <strong className="text-white">v{qbResult.version}</strong>
                  {qbResult.counts && (
                    <span className="ml-2 text-slate-400">
                      (Basic: {qbResult.counts.basic}, Mid: {qbResult.counts.mid}, Advanced: {qbResult.counts.advanced}, Practical: {qbResult.counts.practical})
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQbModal(null);
                  setQbFile(null);
                  setQbResult(null);
                  setQbErrors([]);
                }}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="gradient"
                loading={qbUploading}
                disabled={!qbFile}
                icon={<UploadCloud className="w-4 h-4" />}
              >
                Upload & Verify File
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
