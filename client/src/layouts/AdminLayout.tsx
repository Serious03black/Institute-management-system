import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Calendar, BookOpen,
  Settings, FileText, LogOut, Menu, X, ChevronRight, Clock, GraduationCap,
  BarChart3, Bell, ExternalLink, ShieldCheck, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/students', label: 'Students', icon: Users },
  { path: '/faculty', label: 'Faculty', icon: UserCheck },
  { path: '/batches', label: 'Batches', icon: Calendar },
  { path: '/attendance', label: 'Attendance', icon: Clock, comingSoon: true },
  { path: '/courses', label: 'Courses & Modules', icon: BookOpen },
  { path: '/exams', label: 'Exam Management', icon: GraduationCap },
  { path: '/results', label: 'Results & Practical', icon: BarChart3 },
  { path: '/logs', label: 'Audit Logs', icon: FileText },
  { path: '/settings', label: 'System Settings', icon: Settings },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const currentNav = navItems.find((n) => location.pathname.startsWith(n.path));

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0e17] text-slate-100 font-sans">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col bg-slate-950/90 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 px-6 py-6 border-b border-white/5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-base tracking-tight font-heading">IMS PORTAL</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">PRO</span>
            </div>
            <p className="text-slate-400 text-xs truncate">Institute Management & Exam</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Portal Access Banner */}
        <div className="px-4 pt-4">
          <a
            href="/exam"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-indigo-950/50 to-purple-950/50 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-900/30 transition-all shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white">Exam Portal</p>
                <p className="text-[10px] text-slate-400">Launch student interface</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400/80 mb-2">Main Navigation</p>
          {navItems.map(({ path, label, icon: Icon, comingSoon }) => (
            comingSoon ? (
              <div
                key={path}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400/80 cursor-not-allowed select-none transition-colors"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium flex-1">{label}</span>
                <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-white/5">Coming Soon</span>
              </div>
            ) : (
              <NavLink
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                    <span className="flex-1 tracking-wide">{label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </>
                )}
              </NavLink>
            )
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-white/5 bg-slate-950/50">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-xs font-bold font-heading">
                {admin?.profile?.name?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{admin?.profile?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate">@{admin?.username || 'admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-150"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Topbar */}
        <header className="h-16 bg-slate-950/70 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <h2 className="text-sm font-semibold text-white font-heading">{currentNav?.label || 'Dashboard'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Database Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Atlas Cloud Live</span>
            </div>

            {/* Quick Student Exam Link */}
            <a
              href="/exam"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-medium transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Exam</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>

            {/* Notifications */}
            <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-slate-950" />
            </button>

            {/* Profile Avatar */}
            <NavLink
              to="/settings"
              className="flex items-center gap-2 p-1.5 pr-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-white text-xs font-bold font-heading">
                  {admin?.profile?.name?.charAt(0) || 'A'}
                </span>
              </div>
            </NavLink>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 page-enter bg-[#0b0f19]">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
