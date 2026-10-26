import React, { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Clock, Code, Award, Check, Sparkles, RefreshCw } from 'lucide-react';
import { PageHeader, Badge, Card, Spinner, ErrorMessage } from '../../components/ui/Cards';
import { Table, Pagination } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';
import type { ExamAttempt, ModuleResult, Student } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function ResultsPage() {
  const [tab, setTab] = useState<'check' | 'all' | 'practical' | 'reexam'>('check');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Results & Practical Evaluation"
        subtitle="Review practical programming submissions, examine academic transcripts, and authorize re-examinations"
      />

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 overflow-x-auto">
        {[
          { key: 'check', label: 'Lookup Student Transcript' },
          { key: 'all', label: 'All Exam Results' },
          { key: 'practical', label: 'Practical Evaluations Queue' },
          { key: 'reexam', label: 'Re-Exam Authorization' },
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

      {tab === 'check' && <CheckResultsTab />}
      {tab === 'all' && <AllResultsTab />}
      {tab === 'practical' && <PracticalEvalTab />}
      {tab === 'reexam' && <ReexamTab />}
    </div>
  );
}

function CheckResultsTab() {
  const [studentId, setStudentId] = useState('');
  const [results, setResults] = useState<{
    student: Student;
    results: ModuleResult[];
    allAttempts: ExamAttempt[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const searchResults = async () => {
    if (!studentId.trim()) return;
    setLoading(true);
    setResults(null);
    try {
      const { data } = await api.get(`/results/student/${studentId}`);
      setResults(data.data);
    } catch {
      toast.error('Student not found or no results recorded yet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <Card className="p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Student Transcript Lookup</h3>
        <p className="text-xs text-slate-400 mb-4">
          Enter a Student ID to view their modular marks, percentages, and pass/fail standing
        </p>
        <div className="flex gap-2.5">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchResults()}
              placeholder="Enter Student ID (e.g. STU268932)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <Button onClick={searchResults} loading={loading} variant="gradient">
            Search Transcript
          </Button>
        </div>
      </Card>

      {results && (
        <div className="space-y-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-md">
              {results.student.personalInfo?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-heading">
                {results.student.personalInfo?.name}
              </h3>
              <p className="font-mono text-indigo-400 text-xs mt-0.5">
                {results.student.studentId} · {results.student.enrollment?.courseTitleSnapshot}
              </p>
            </div>
          </Card>

          {results.results.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs rounded-2xl bg-white/[0.02] border border-white/5">
              No finalized exam results recorded for this student yet.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {results.results.map((result) => {
                const mod = result.moduleId as { title: string; moduleId: string };
                const pct = result.maximumMarks > 0 ? Math.round((result.totalMarks / result.maximumMarks) * 100) : 0;
                const isPass = result.status === 'PASS';
                return (
                  <Card key={result._id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-white text-sm font-heading">{mod?.title || 'Module'}</h4>
                          <span className="font-mono text-[10px] text-slate-400">{mod?.moduleId}</span>
                        </div>
                        <Badge variant={isPass ? 'success' : result.status === 'FAIL' ? 'danger' : 'warning'} dot>
                          {result.status}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Objective Marks:</span>
                          <span className="font-semibold text-white">{result.objectiveMarks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Practical Evaluation:</span>
                          <span className="font-semibold text-white">{result.practicalMarks}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2">
                          <span className="text-slate-300 font-semibold">Total Score:</span>
                          <span className={`font-extrabold text-sm ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.totalMarks} / {result.maximumMarks}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Passing Threshold:</span>
                          <span className="text-slate-400">{result.passingMarks}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Gauge */}
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-slate-400">Percentage Attained</span>
                        <span className={`font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPass ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AllResultsTab() {
  const [results, setResults] = useState<ModuleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/results', {
        params: { page, limit: 20, status: statusFilter || undefined },
      });
      setResults(data.data || []);
      setTotal(data.total || 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (r: ModuleResult) => (
        <div>
          <p className="font-semibold text-white">{(r.studentId as Student)?.personalInfo?.name}</p>
          <p className="font-mono text-xs text-indigo-400">{(r.studentId as Student)?.studentId}</p>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module Examined',
      render: (r: ModuleResult) => (
        <span className="text-slate-200 font-medium">{(r.moduleId as { title: string })?.title}</span>
      ),
    },
    {
      key: 'objective',
      header: 'Objective',
      render: (r: ModuleResult) => (
        <span className="text-xs font-mono text-slate-300">{r.objectiveMarks}</span>
      ),
    },
    {
      key: 'practical',
      header: 'Practical',
      render: (r: ModuleResult) => (
        <span className="text-xs font-mono text-slate-300">{r.practicalMarks}</span>
      ),
    },
    {
      key: 'total',
      header: 'Final Score',
      render: (r: ModuleResult) => {
        const isPass = r.totalMarks >= r.passingMarks;
        return (
          <span className={`font-mono font-bold ${isPass ? 'text-emerald-400' : 'text-rose-400'}`}>
            {r.totalMarks} / {r.maximumMarks}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Standing',
      render: (r: ModuleResult) => (
        <Badge
          variant={
            r.status === 'PASS'
              ? 'success'
              : r.status === 'FAIL'
              ? 'danger'
              : 'warning'
          }
          dot
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Finalized',
      render: (r: ModuleResult) => (
        <span className="text-xs text-slate-400">
          {r.finalizedAt ? format(new Date(r.finalizedAt), 'dd MMM yyyy') : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="max-w-xs">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3.5 py-2 text-xs bg-slate-950/70 border border-white/10 text-white rounded-xl focus:outline-none focus:border-indigo-500"
          >
            <option value="" className="bg-slate-900">All Examination Statuses</option>
            <option value="PASS" className="bg-slate-900">Passed Students</option>
            <option value="FAIL" className="bg-slate-900">Failed / Re-Exam Required</option>
            <option value="PENDING_REVIEW" className="bg-slate-900">Pending Instructor Review</option>
          </select>
        </div>
      </Card>

      <Table
        columns={columns}
        data={results}
        loading={loading}
        rowKey={(r) => r._id}
        emptyMessage="No examination results recorded"
      />
      <Pagination page={page} total={total} limit={20} onPage={setPage} />
    </div>
  );
}

function PracticalEvalTab() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [evalTarget, setEvalTarget] = useState<ExamAttempt | null>(null);
  const [marks, setMarks] = useState<
    { questionId: string; awardedMarks: number; isCorrect: boolean; comment: string }[]
  >([]);
  const [evalLoading, setEvalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/results/pending-practical', { params: { page, limit: 20 } });
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

  const openEval = (attempt: ExamAttempt) => {
    const practicalQs = attempt.selectedQuestions?.filter((q) => q.section === 'PRACTICAL') || [];
    setMarks(
      practicalQs.map((q) => ({
        questionId: q.questionId,
        awardedMarks: 5,
        isCorrect: true,
        comment: '',
      }))
    );
    setEvalTarget(attempt);
  };

  const submitEvaluation = async () => {
    if (!evalTarget) return;
    setEvalLoading(true);
    try {
      await api.post(`/results/${evalTarget.attemptId}/practical-evaluation`, {
        questionEvaluations: marks,
      });
      toast.success('Practical code evaluation submitted & finalized!');
      setEvalTarget(null);
      fetchData();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to submit evaluation');
    } finally {
      setEvalLoading(false);
    }
  };

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
      header: 'Module',
      render: (a: ExamAttempt) => (
        <span className="text-slate-200">{(a.moduleId as { title: string })?.title}</span>
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
    {
      key: 'obj',
      header: 'Objective Score',
      render: (a: ExamAttempt) => (
        <span className="font-mono text-emerald-400 font-semibold">
          {a.objectiveEvaluation?.totalObjectiveMarks ?? '—'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (a: ExamAttempt) => (
        <Button
          size="sm"
          variant="gradient"
          icon={<Code className="w-3.5 h-3.5" />}
          onClick={() => openEval(a)}
        >
          Evaluate Code
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
        <Clock className="w-5 h-5 flex-shrink-0" />
        <span>
          Pending Evaluation Queue: Students listed below have submitted their examination, but their practical code submissions await instructor review.
        </span>
      </div>

      <Table
        columns={columns}
        data={attempts}
        loading={loading}
        rowKey={(a) => a._id}
        emptyMessage="No practical code submissions awaiting evaluation"
      />
      <Pagination page={page} total={total} limit={20} onPage={setPage} />

      {/* Practical Code Evaluation Modal */}
      <Modal
        open={!!evalTarget}
        onClose={() => setEvalTarget(null)}
        title={`Practical Code Evaluation — ${evalTarget?.attemptId}`}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setEvalTarget(null)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={submitEvaluation} loading={evalLoading}>
              Submit Evaluation & Finalize
            </Button>
          </>
        }
      >
        {evalTarget && (
          <div className="space-y-6">
            {evalTarget.selectedQuestions
              ?.filter((q) => q.section === 'PRACTICAL')
              .map((q, idx) => {
                const ans = evalTarget.answers?.find((a) => a.questionId === q.questionId);
                const markEntry = marks[idx];
                return (
                  <div
                    key={q.questionId}
                    className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold font-mono">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-white text-xs font-heading">
                          Practical Programming Problem
                        </h4>
                      </div>
                      <Badge variant="purple">10 MARKS</Badge>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-200 leading-relaxed">
                      {q.questionText}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Submitted Code Solution:</span>
                      </p>
                      <pre className="p-4 rounded-xl bg-[#030712] border border-white/10 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                        {ans?.codeAnswer || '// Student submitted no practical code for this question.'}
                      </pre>
                    </div>

                    {markEntry && (
                      <div className="grid sm:grid-cols-3 gap-4 pt-3 border-t border-white/5 items-center">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Solution Verified?
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setMarks((ms) =>
                                  ms.map((m, i) => (i === idx ? { ...m, isCorrect: true, awardedMarks: 5 } : m))
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                markEntry.isCorrect
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : 'bg-white/5 text-slate-400 border-white/10'
                              }`}
                            >
                              ✓ Correct
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setMarks((ms) =>
                                  ms.map((m, i) => (i === idx ? { ...m, isCorrect: false, awardedMarks: 0 } : m))
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                !markEntry.isCorrect
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                  : 'bg-white/5 text-slate-400 border-white/10'
                              }`}
                            >
                              ✕ Incorrect
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Marks Awarded (Max 5)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            value={markEntry.awardedMarks}
                            onChange={(e) =>
                              setMarks((ms) =>
                                ms.map((m, i) =>
                                  i === idx ? { ...m, awardedMarks: Number(e.target.value) } : m
                                )
                              )
                            }
                            className="w-24 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Instructor Remarks
                          </label>
                          <input
                            type="text"
                            value={markEntry.comment}
                            onChange={(e) =>
                              setMarks((ms) =>
                                ms.map((m, i) => (i === idx ? { ...m, comment: e.target.value } : m))
                              )
                            }
                            placeholder="Optional evaluation comments..."
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ReexamTab() {
  const [studentId, setStudentId] = useState('');
  const [failedResults, setFailedResults] = useState<ModuleResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [authorizeLoading, setAuthorizeLoading] = useState('');

  const search = async () => {
    if (!studentId.trim()) return;
    setLoading(true);
    setFailedResults([]);
    try {
      const { data } = await api.get('/results/reexams/eligible', { params: { studentId } });
      setFailedResults(data.data || []);
    } catch {
      toast.error('Error finding re-exam eligible records');
    } finally {
      setLoading(false);
    }
  };

  const authorize = async (result: ModuleResult) => {
    const student = result.studentId as Student;
    const module = result.moduleId as { moduleId: string; title: string };
    setAuthorizeLoading(result._id);
    try {
      await api.post('/results/reexams', {
        studentId: student.studentId,
        moduleId: module.moduleId,
      });
      toast.success(`Re-exam authorized for ${module.title}`);
      search();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to authorize re-exam');
    } finally {
      setAuthorizeLoading('');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-base font-bold text-white font-heading mb-1">Re-Examination Authorization</h3>
        <p className="text-xs text-slate-400 mb-4">
          Students who scored below the passing mark can be authorized for a re-examination attempt
        </p>
        <div className="flex gap-2.5">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Enter Student ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <Button onClick={search} loading={loading} variant="gradient">
            Search
          </Button>
        </div>
      </Card>

      {failedResults.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {failedResults.length} module(s) eligible for re-exam attempt:
          </p>
          {failedResults.map((result) => {
            const student = result.studentId as Student;
            const module = result.moduleId as { title: string; moduleId: string };
            return (
              <Card key={result._id} className="p-5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm font-heading">{module?.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {student.personalInfo?.name} · <span className="font-mono text-indigo-400">{student.studentId}</span>
                  </p>
                  <p className="text-xs text-rose-400 font-semibold mt-1.5">
                    Previous Score: {result.totalMarks} / {result.maximumMarks} (Passing: {result.passingMarks})
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => authorize(result)}
                  loading={authorizeLoading === result._id}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Authorize Re-Exam
                </Button>
              </Card>
            );
          })}
        </div>
      ) : studentId && !loading ? (
        <div className="text-center py-12 text-slate-400 rounded-2xl bg-white/[0.02] border border-white/5">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
          <p className="font-medium text-white text-xs">No Failed Modules Found</p>
          <p className="text-[11px] text-slate-500 mt-0.5">This student has passed all attempted exams or has no eligible records</p>
        </div>
      ) : null}
    </div>
  );
}
