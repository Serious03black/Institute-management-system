import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Cards';
import { Input, Textarea } from '../../components/ui/Input';
import type { Student, Course, Faculty } from '../../types';
import api from '../../services/api';
import toast from 'react-hot-toast';

export function EditStudentForm({ student, courses, faculties, onClose, onSuccess }: {
  student: Student; courses: Course[]; faculties: Faculty[]; onClose: () => void; onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(student.personalInfo.name);
  const [mobile, setMobile] = useState(student.personalInfo.mobile);
  const [email, setEmail] = useState(student.personalInfo.email || '');
  const [address, setAddress] = useState(student.personalInfo.address);
  const [courseFee, setCourseFee] = useState(student.fees.courseFee);

  const handleSave = async () => {
    if (!reason.trim()) { toast.error('Please provide a reason for this change'); return; }
    setLoading(true);
    try {
      await api.patch(`/students/${student.studentId}`, {
        reason,
        changes: {
          personalInfo: { name, mobile, email, address },
          fees: { courseFee: Number(courseFee) },
        },
      });
      toast.success('Student updated successfully');
      onSuccess();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to update student');
    } finally { setLoading(false); }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Edit Student Profile — ${student.studentId}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={handleSave} loading={loading} disabled={!reason.trim()}>Save Changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-300 flex items-center gap-2">
          <span className="text-amber-400 text-base">⚠️</span>
          <span>Security & Compliance: All modifications are strictly logged to the system audit trail. Please state an explicit reason.</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} />
          <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Course Fee (₹)" type="number" value={courseFee} onChange={e => setCourseFee(Number(e.target.value))} />
        </div>
        <Textarea label="Permanent Residential Address" value={address} onChange={e => setAddress(e.target.value)} rows={2} />
        <div>
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1 font-display">
            Reason for Modification <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Document why this profile or fee modification is being performed..."
            className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm resize-none h-20 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
    </Modal>
  );
}
