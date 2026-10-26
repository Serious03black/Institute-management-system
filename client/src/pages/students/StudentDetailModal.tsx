import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Cards';
import type { Student } from '../../types';
import { format } from 'date-fns';

export function StudentDetailModal({ student, onClose }: { student: Student | null; onClose: () => void }) {
  if (!student) return null;
  const mods = student.enrollment?.moduleSnapshots || [];
  return (
    <Modal open={!!student} onClose={onClose} title={`Student Dossier — ${student.studentId}`} size="lg">
      <div className="space-y-6">
        {/* Header Profile */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
            <span className="text-white text-xl font-bold font-heading">{student.personalInfo?.name?.charAt(0) || 'S'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white font-heading">{student.personalInfo?.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-indigo-400 text-xs font-semibold">{student.studentId}</span>
              <Badge variant={student.status === 'CURRENT' ? 'success' : student.status === 'CANCELLED' ? 'danger' : 'info'} dot>
                {student.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Personal Details */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">A. Personal Information</h4>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <Field label="Mobile" value={student.personalInfo?.mobile} />
            <Field label="Parent Mobile" value={student.personalInfo?.parentMobile} />
            <Field label="Email" value={student.personalInfo?.email || '—'} />
            <Field label="Date of Birth" value={student.personalInfo?.dateOfBirth ? format(new Date(student.personalInfo.dateOfBirth), 'dd MMM yyyy') : '—'} />
            <Field label="Education" value={student.personalInfo?.education} />
            <Field label="Address" value={student.personalInfo?.address} />
          </div>
        </div>

        {/* Enrollment & Curriculum */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">B. Academic Enrollment</h4>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <Field label="Enrolled Course" value={student.enrollment?.courseTitleSnapshot || 'General'} />
            <Field label="Assigned Faculty" value={student.enrollment?.facultyNameSnapshot || '—'} />
            <Field label="Batch Schedule" value={`${student.enrollment?.batchType} (${student.enrollment?.batchTime || 'Standard'})`} />
            <Field label="Joining Date" value={student.enrollment?.joiningDate ? format(new Date(student.enrollment.joiningDate), 'dd MMM yyyy') : '—'} />
            <Field label="Course Duration" value={student.enrollment?.courseDuration || '6 Months'} />
          </div>
        </div>

        {/* Modules List */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Enrolled Modules</h4>
          <div className="flex flex-wrap gap-2">
            {mods.map((m) => (
              <span key={String(m.moduleId)} className="px-3 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl font-medium">
                {m.title}
              </span>
            ))}
            {mods.length === 0 && <span className="text-slate-500 text-xs">No specific modules mapped</span>}
          </div>
        </div>

        {/* Financial Information */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">C. Fee Status</h4>
          <div className="grid sm:grid-cols-2 gap-4 text-xs bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <Field label="Registration Fee" value={`₹${student.fees?.registrationFee || 100}`} />
            <Field label="Course Fee" value={`₹${student.fees?.courseFee?.toLocaleString() || 0}`} />
          </div>
        </div>

        {/* Cancellation Notice if applicable */}
        {student.status === 'CANCELLED' && student.cancellationDetails && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
            <p className="text-xs font-bold text-rose-400 mb-1">Cancellation Record</p>
            <p className="text-xs text-rose-300">
              Cancelled on: {format(new Date(student.cancellationDetails.cancelledAt), 'dd MMM yyyy')}
            </p>
            <p className="text-xs text-rose-300 mt-0.5">
              Reason: {student.cancellationDetails.reason}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-slate-200 font-medium">{value}</p>
    </div>
  );
}
