import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Send, Code, LogOut, ShieldAlert, Sparkles, KeyRound, Check, FileCheck, Layers
} from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Editor from '@monaco-editor/react';

// ======= TYPES =======
interface StudentInfo {
  studentId: string;
  personalInfo: { name: string };
  enrollment: {
    courseTitleSnapshot: string;
    moduleSnapshots: { moduleId: string; title: string }[];
  };
}

interface ModuleStatus {
  moduleId: { _id: string; moduleId: string; title: string };
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  attemptId?: string;
}

interface Question {
  questionId: string;
  section: string;
  questionText: string;
  options?: { A: string; B: string; C: string; D: string };
  maximumMarks: number;
}

interface Answer {
  questionId: string;
  selectedOption?: string;
  codeAnswer?: string;
}

const examApi = axios.create({ baseURL: '/api/v1/exam', withCredentials: true });

// ======= MAIN EXAM PORTAL =======
export function ExamPortal() {
  const [phase, setPhase] = useState<'login' | 'home' | 'exam'>('login');
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [moduleStatuses, setModuleStatuses] = useState<ModuleStatus[]>([]);
  const [activeAttemptId, setActiveAttemptId] = useState('');
  const [activeModuleTitle, setActiveModuleTitle] = useState('');

  const handleLogin = (s: StudentInfo, ms: ModuleStatus[]) => {
    setStudent(s);
    setModuleStatuses(ms);
    setPhase('home');
  };

  const handleStartExam = (attemptId: string, moduleTitle: string) => {
    setActiveAttemptId(attemptId);
    setActiveModuleTitle(moduleTitle);
    setPhase('exam');
  };

  const handleLogout = () => {
    document.cookie = 'examToken=; Max-Age=0; path=/';
    setPhase('login');
    setStudent(null);
  };

  if (phase === 'login') return <ExamLogin onLogin={handleLogin} />;
  if (phase === 'exam')
    return (
      <ExamScreen
        attemptId={activeAttemptId}
        moduleTitle={activeModuleTitle}
        onDone={() => setPhase('home')}
      />
    );
  return (
    <ExamHome
      student={student!}
      moduleStatuses={moduleStatuses}
      onStartExam={handleStartExam}
      onLogout={handleLogout}
    />
  );
}

// ======= LOGIN =======
function ExamLogin({ onLogin }: { onLogin: (s: StudentInfo, ms: ModuleStatus[]) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-check if already logged in
  useEffect(() => {
    examApi
      .get('/access/me')
      .then((r) => {
        if (r.data.success) onLogin(r.data.data.student, r.data.data.moduleStatuses);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await examApi.post('/access/login', { examUsername: username.trim(), password: password.trim() });
      const { data } = await examApi.get('/access/me');
      onLogin(data.data.student, data.data.moduleStatuses);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Invalid exam credentials. Verify with your administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-slate-100 p-4 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 mb-4 shadow-xl shadow-indigo-600/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-heading">
            Student Online Examination
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Secure proctored testing platform for enrolled institute candidates
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Exam Username</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. EXSTU268932153"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Access Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter one-time access password"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Enter Secure Portal'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Session activity is monitored for academic integrity</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======= HOME =======
function ExamHome({
  student,
  moduleStatuses,
  onStartExam,
  onLogout,
}: {
  student: StudentInfo;
  moduleStatuses: ModuleStatus[];
  onStartExam: (id: string, title: string) => void;
  onLogout: () => void;
}) {
  const [starting, setStarting] = useState('');

  const startExam = async (mod: ModuleStatus) => {
    if (mod.status === 'COMPLETED') {
      toast.error('This module exam has already been completed.');
      return;
    }
    if (mod.status === 'IN_PROGRESS' && mod.attemptId) {
      onStartExam(mod.attemptId, mod.moduleId.title);
      return;
    }
    setStarting(mod.moduleId._id);
    try {
      const { data } = await examApi.post('/attempts/start', { moduleId: mod.moduleId.moduleId });
      onStartExam(data.data.attemptId, mod.moduleId.title);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to start examination');
    } finally {
      setStarting('');
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 lg:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Student Profile Card */}
        <div className="p-6 rounded-3xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-600/30">
              {student.personalInfo?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-heading">{student.personalInfo?.name}</h2>
                <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {student.studentId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{student.enrollment?.courseTitleSnapshot}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Instructions banner */}
        <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-slate-300 space-y-2">
          <p className="font-bold text-indigo-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Instructions Before Commencing</span>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px] leading-relaxed">
            <li>Ensure a reliable internet connection before starting the test.</li>
            <li>Each module consists of objective multiple choice questions and practical programming problems.</li>
            <li>Answers auto-save in real-time. Once submitted, your exam attempt cannot be reopened.</li>
          </ul>
        </div>

        {/* Modules to take */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider px-1">
            Assigned Course Modules
          </h3>

          <div className="space-y-3">
            {moduleStatuses.map((mod) => {
              const isCompleted = mod.status === 'COMPLETED';
              const isInProgress = mod.status === 'IN_PROGRESS';
              return (
                <div
                  key={mod.moduleId._id}
                  className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${
                    isCompleted
                      ? 'bg-slate-900/40 border-white/5 opacity-80'
                      : isInProgress
                      ? 'bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-900/70 border-white/10 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isInProgress
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : isInProgress ? (
                        <Clock className="w-6 h-6 animate-pulse" />
                      ) : (
                        <GraduationCap className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm font-heading">{mod.moduleId.title}</p>
                        <span className="font-mono text-[10px] text-slate-400">({mod.moduleId.moduleId})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isCompleted
                          ? 'Exam Completed • Graded or Pending Practical Review'
                          : isInProgress
                          ? 'Active Exam Session in Progress'
                          : 'Ready to Begin Examination'}
                      </p>
                    </div>
                  </div>

                  {!isCompleted && (
                    <button
                      onClick={() => startExam(mod)}
                      disabled={starting === mod.moduleId._id}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                        isInProgress
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white'
                      }`}
                    >
                      {starting === mod.moduleId._id
                        ? 'Loading...'
                        : isInProgress
                        ? 'Resume Test ↗'
                        : 'Start Exam →'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ======= EXAM SCREEN =======
function ExamScreen({
  attemptId,
  moduleTitle,
  onDone,
}: {
  attemptId: string;
  moduleTitle: string;
  onDone: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tab switch anti-cheating warning
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !submitted) {
        toast.error('Warning: Tab switch detected. Proctoring activity has been recorded.', {
          icon: '⚠️',
          duration: 4000,
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [submitted]);

  // Load attempt
  useEffect(() => {
    examApi
      .get(`/attempts/${attemptId}`)
      .then((r) => {
        const attempt = r.data.data;
        setQuestions(attempt.selectedQuestions || []);
        setDeadline(new Date(attempt.deadline));
        setTimeLeft(Math.max(0, Math.floor((new Date(attempt.deadline).getTime() - Date.now()) / 1000)));

        const savedAnswers: Record<string, Answer> = {};
        (attempt.answers || []).forEach((a: Answer) => {
          savedAnswers[a.questionId] = a;
        });
        setAnswers(savedAnswers);
        if (['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'].includes(attempt.attemptStatus)) {
          setSubmitted(true);
        }
      })
      .catch(() => toast.error('Failed to load examination attempt'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  // Countdown timer
  useEffect(() => {
    if (!deadline || submitted) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(timerRef.current!);
        handleSubmit(true);
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deadline, submitted]);

  // Auto-save answers periodically (every 25s)
  useEffect(() => {
    if (submitted) return;
    saveRef.current = setInterval(() => saveAnswers(false), 25000);
    return () => {
      if (saveRef.current) clearInterval(saveRef.current);
    };
  }, [answers, submitted]);

  const saveAnswers = async (showToast = false) => {
    const toSave = Object.values(answers);
    if (toSave.length === 0) return;
    try {
      await examApi.patch(`/attempts/${attemptId}/answers`, { answers: toSave });
      if (showToast) toast.success('Answers auto-saved');
    } catch {
      /* silent */
    }
  };

  const handleAnswer = (questionId: string, field: 'selectedOption' | 'codeAnswer', value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, [field]: value },
    }));
  };

  const handleSubmit = async (auto = false) => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      await saveAnswers();
      await examApi.post(`/attempts/${attemptId}/submit`, {
        reason: auto ? 'TIME_EXPIRED' : 'COMPLETED',
      });
      setSubmitted(true);
      if (!auto) toast.success('Exam submitted successfully!');
    } catch {
      toast.error('Failed to submit exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4">
        <div className="p-8 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 max-w-md w-full text-center shadow-2xl space-y-4">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white font-heading">Exam Successfully Submitted!</h2>
          <p className="text-xs text-slate-300">
            Module: <strong className="text-indigo-400">{moduleTitle}</strong>
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            All your responses have been recorded and auto-graded. Any practical code questions are queued for instructor evaluation.
          </p>
          <button
            onClick={onDone}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const current = questions[currentIdx];
  if (!current) return null;
  const answeredCount = Object.keys(answers).length;
  const isWarning = timeLeft < 300; // under 5 minutes

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 font-sans select-none">
      {/* Top Proctoring & Timer Header */}
      <header className="h-16 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white text-xs font-heading">{moduleTitle}</p>
            <p className="text-[11px] text-slate-400">
              {answeredCount} of {questions.length} questions answered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-sm font-bold ${
              isWarning
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-emerald-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => saveAnswers(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
          >
            Save Progress
          </button>

          <button
            onClick={() => {
              if (window.confirm('Are you ready to submit your exam?')) handleSubmit();
            }}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Main Examination Viewport */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Question Navigation Matrix */}
        <aside className="w-64 bg-slate-950/60 border-r border-white/5 p-4 overflow-y-auto hidden lg:flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Questions</p>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                Total {questions.length}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.questionId];
                const isCurrent = i === currentIdx;
                return (
                  <button
                    key={q.questionId}
                    onClick={() => setCurrentIdx(i)}
                    className={`w-full aspect-square rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-white/50'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
              <span className="text-slate-400">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-indigo-600" />
              <span className="text-slate-400">Current Question</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-white/5 border border-white/10" />
              <span className="text-slate-400">Unanswered</span>
            </div>
          </div>
        </aside>

        {/* Question & Answer Working Space */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Question Card */}
            <div className="p-6 rounded-3xl bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      current.section === 'BASIC'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : current.section === 'MID'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : current.section === 'ADVANCED'
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {current.section} SECTION
                  </span>
                  <span className="text-slate-400 text-xs">
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                </div>
                <span className="font-mono text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded">
                  {current.maximumMarks} Mark{current.maximumMarks > 1 ? 's' : ''}
                </span>
              </div>

              <p className="text-base text-white font-medium leading-relaxed">
                {current.questionText}
              </p>
            </div>

            {/* Objective MCQ Selection */}
            {current.section !== 'PRACTICAL' && current.options && (
              <div className="grid gap-3">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const optText = current.options![opt];
                  const isSelected = answers[current.questionId]?.selectedOption === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(current.questionId, 'selectedOption', opt)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-4 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                          : 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono transition-all flex-shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {opt}
                      </span>
                      <span className="text-xs leading-relaxed flex-1">{optText}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Practical Coding Workspace with Monaco Editor */}
            {current.section === 'PRACTICAL' && (
              <div className="rounded-2xl border border-white/10 bg-slate-950 overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Code className="w-4 h-4" />
                    <span className="font-semibold text-white">JavaScript Code Editor</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">Monaco IDE Engine</span>
                </div>
                <div className="h-72">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={answers[current.questionId]?.codeAnswer || '// Write your code solution here...\n'}
                    onChange={(val) => handleAnswer(current.questionId, 'codeAnswer', val || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (window.confirm('Submit completed examination?')) handleSubmit();
                  }}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Exam</span>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      <Toaster position="top-right" toastOptions={{ style: { background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
    </div>
  );
}
