import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, UserCheck, BookOpen, Calendar, TrendingUp, Award,
  XCircle, Clock, CheckCircle, AlertCircle, ArrowUpRight,
  Sparkles, PlusCircle, FileSpreadsheet, ShieldAlert
} from 'lucide-react';
import { StatCard, PageHeader, Card, Spinner, ErrorMessage, Badge } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { NavLink } from 'react-router-dom';
import api from '../../services/api';
import type { DashboardSummary } from '../../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, a] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/analytics'),
      ]);
      setSummary(s.data.data);
      setAnalytics(a.data.data);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <Spinner size="lg" />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;

  const enrollmentTrend = (
    (analytics?.enrollmentTrend as { _id: { year: number; month: number }; count: number }[]) || []
  ).map((e) => ({
    name: `${e._id.year}-${String(e._id.month).padStart(2, '0')}`,
    students: e.count,
  }));

  const statusDist = (analytics?.statusDistribution as { name: string; value: number }[]) || [];
  const courseDist = (analytics?.courseDistribution as { _id: string; count: number }[]) || [];
  const recentReg = (
    (analytics?.recentRegistrations as {
      studentId: string;
      personalInfo: { name: string };
      enrollment: { courseTitleSnapshot: string };
      status: string;
      createdAt: string;
    }[]) || []
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-white/10 p-6 lg:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Academic Intelligence</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-heading">
              Institute Management Overview
            </h1>
            <p className="text-xs lg:text-sm text-slate-400 max-w-xl">
              Welcome back, Administrator. Monitor live student enrollments, exam status, and curriculum analytics.
            </p>
          </div>

          {/* Quick Action Hub */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <NavLink to="/students">
              <Button size="sm" variant="gradient" icon={<PlusCircle className="w-3.5 h-3.5" />}>
                Register Student
              </Button>
            </NavLink>
            <NavLink to="/courses">
              <Button size="sm" variant="outline" icon={<BookOpen className="w-3.5 h-3.5" />}>
                Manage Courses
              </Button>
            </NavLink>
            <NavLink to="/exams">
              <Button size="sm" variant="secondary" icon={<Clock className="w-3.5 h-3.5" />}>
                Exam Control
              </Button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Students"
          value={summary?.totalStudents || 0}
          icon={<Users className="w-5 h-5" />}
          gradient="from-indigo-600 to-indigo-500"
          trend={{ value: 12, label: '+12% this mo.' }}
        />
        <StatCard
          title="Active Students"
          value={summary?.currentStudents || 0}
          icon={<CheckCircle className="w-5 h-5" />}
          gradient="from-emerald-600 to-teal-500"
          badgeText="Active"
        />
        <StatCard
          title="Completed"
          value={summary?.completedStudents || 0}
          icon={<Award className="w-5 h-5" />}
          gradient="from-blue-600 to-cyan-500"
        />
        <StatCard
          title="Faculty"
          value={summary?.totalFaculty || 0}
          icon={<UserCheck className="w-5 h-5" />}
          gradient="from-purple-600 to-pink-500"
        />
        <StatCard
          title="Active Batches"
          value={summary?.activeBatches || 0}
          icon={<Calendar className="w-5 h-5" />}
          gradient="from-amber-600 to-orange-500"
        />
      </div>

      {/* Secondary Performance Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Courses"
          value={summary?.totalCourses || 0}
          icon={<BookOpen className="w-5 h-5" />}
          gradient="from-sky-600 to-blue-500"
        />
        <StatCard
          title="Pending Exams"
          value={summary?.studentsWithPendingExams || 0}
          icon={<Clock className="w-5 h-5" />}
          gradient="from-amber-500 to-yellow-600"
          badgeText="Action"
        />
        <StatCard
          title="Passed Exams"
          value={summary?.passedStudents || 0}
          icon={<TrendingUp className="w-5 h-5" />}
          gradient="from-emerald-500 to-green-600"
        />
        <StatCard
          title="Failed / Re-Exam"
          value={summary?.failedStudents || 0}
          icon={<AlertCircle className="w-5 h-5" />}
          gradient="from-rose-600 to-red-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Enrollment Trend */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white font-heading">Enrollment Trajectory</h2>
              <p className="text-xs text-slate-400">Student enrollment progression over time</p>
            </div>
            <Badge variant="cyan" dot>Live Sync</Badge>
          </div>
          {enrollmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={enrollmentTrend}>
                <defs>
                  <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fill="url(#enrollGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-xs">
              <Calendar className="w-8 h-8 mb-2 opacity-50" />
              <span>Enrollment trajectory will dynamically render as students enroll.</span>
            </div>
          )}
        </Card>

        {/* Student Status Pie / Donut */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white font-heading">Student Distribution</h2>
              <Badge variant="purple">Active</Badge>
            </div>
            {statusDist.some((s) => s.value > 0) ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {statusDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs">
                <span>No status breakdown available yet.</span>
              </div>
            )}
          </div>
          <div className="space-y-2 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Current Students
              </span>
              <span className="font-semibold text-white">{summary?.currentStudents || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Graduated
              </span>
              <span className="font-semibold text-white">{summary?.completedStudents || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cancelled
              </span>
              <span className="font-semibold text-white">{summary?.cancelledStudents || 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity / Registrations Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white font-heading">Recent Student Registrations</h2>
            <p className="text-xs text-slate-400">Most recent student enrollment records in MongoDB Atlas</p>
          </div>
          <NavLink
            to="/students"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>View All Students</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        {recentReg.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No student registrations recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Course Enrolled</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentReg.map((r) => (
                  <tr key={r.studentId} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3">
                      <div>
                        <p className="font-semibold text-white">{r.personalInfo?.name}</p>
                        <p className="text-[11px] text-slate-500">{r.studentId}</p>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">
                      {r.enrollment?.courseTitleSnapshot || 'General Course'}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          r.status === 'CURRENT'
                            ? 'success'
                            : r.status === 'COMPLETED'
                            ? 'info'
                            : 'danger'
                        }
                        dot
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-400">
                      {r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
