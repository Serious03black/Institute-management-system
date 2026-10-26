import React, { useState } from 'react';
import { GraduationCap, Lock, User, Eye, EyeOff, Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back, Administrator!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-slate-100 p-4 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 mb-4 shadow-xl shadow-indigo-600/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-heading">
            Institute Management System
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Administrative Command & Academic Operations
          </p>
        </div>

        {/* Login Card */}
        <div className="p-8 rounded-3xl bg-slate-900/70 backdrop-blur-2xl border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Admin Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter administrator username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security password"
                  className="w-full pl-10 pr-12 py-2.5 bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 rounded-xl text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              loading={loading}
              className="w-full py-3 text-xs font-bold tracking-wide mt-2"
            >
              Sign In to Admin Portal
            </Button>
          </form>

          {/* Quick Demo Credentials Reminder */}
          <div className="mt-5 p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Default Admin:</span>
            <span className="font-mono text-indigo-300 font-semibold">admin / Admin@123</span>
          </div>

          {/* Student Exam Link */}
          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <a
              href="/exam"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Are you a student? Launch Student Exam Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
