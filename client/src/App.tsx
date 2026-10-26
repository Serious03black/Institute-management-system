import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StudentsPage } from './pages/students/StudentsPage';
import { FacultyPage } from './pages/faculty/FacultyPage';
import { BatchesPage } from './pages/batches/BatchesPage';
import { CoursesPage } from './pages/courses/CoursesPage';
import { ExamsPage } from './pages/exams/ExamsPage';
import { ExamPortal } from './pages/exams/ExamPortal';
import { ResultsPage } from './pages/results/ResultsPage';
import { LogsPage } from './pages/logs/LogsPage';
import { SettingsPage } from './pages/settings/SettingsPage';

function AdminApp() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/students/*" element={<StudentsPage />} />
        <Route path="/faculty" element={<FacultyPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings/*" element={<SettingsPage />} />
        <Route path="/attendance" element={<AttendanceComingSoon />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
}

function AttendanceComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-4xl">🚧</span>
      </div>
      <h2 className="text-2xl font-bold text-slate-700 mb-2">Attendance — Coming Soon</h2>
      <p className="text-slate-400 max-w-sm">The attendance module is currently under development and will be available in the next update.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' } }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Student Exam Portal — no admin auth needed */}
          <Route path="/exam" element={<ExamPortal />} />
          <Route path="/exam/*" element={<ExamPortal />} />

          {/* Admin Panel */}
          <Route path="/*" element={<ProtectedRoute><AdminApp /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
