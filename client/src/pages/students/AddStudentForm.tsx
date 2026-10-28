import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Cards';
import type { Course, Faculty, Batch } from '../../types';
import api from '../../services/api';
import toast from 'react-hot-toast';

const phoneRegex = /^(?:(?:\+|0{0,2})91(\s*[-]\s*)?|[0]?)?[6789]\d{9}$/;

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().min(5, 'Address required (minimum 5 characters)'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits')
    .refine((val) => phoneRegex.test(val.trim()), 'Enter valid 10-digit mobile number'),
  parentMobile: z.string().optional()
    .refine((val) => !val || phoneRegex.test(val.trim()), 'Enter valid 10-digit parent mobile'),
  dateOfBirth: z.string().min(1, 'Date of birth required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  education: z.string().min(2, 'Education required'),
  courseId: z.string().min(1, 'Please select a course'),
  moduleIds: z.array(z.string()).min(1, 'Select at least one module'),
  registrationFee: z.coerce.number().min(0, 'Registration fee must be 0 or more').default(100),
  courseFee: z.coerce.number().min(0, 'Course fee must be 0 or more').default(0),
  joiningDate: z.string().min(1, 'Joining date required'),
  courseDuration: z.string().min(1, 'Course duration required'),
  batchType: z.enum(['DAILY', 'ALTERNATE', 'WEEKLY']),
  batchId: z.string().optional(),
  batchTime: z.string().optional(),
  facultyId: z.string().min(1, 'Please select an assigned faculty'),
});

type FormData = z.infer<typeof schema>;

export function AddStudentForm({ courses, faculties, onSuccess }: {
  courses: Course[];
  faculties: Faculty[];
  onSuccess: (studentId: string) => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [createdStudentId, setCreatedStudentId] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      registrationFee: 100,
      courseFee: 0,
      moduleIds: [],
      batchType: 'DAILY',
      joiningDate: todayStr,
      courseDuration: '3 Months',
    },
  });

  const watchCourseId = watch('courseId');
  const watchBatchType = watch('batchType');

  useEffect(() => {
    if (watchCourseId) {
      const course = courses.find(c => c._id === watchCourseId);
      setSelectedCourse(course || null);
      if (course && Array.isArray(course.moduleIds)) {
        const activeIds = (course.moduleIds as { _id: string; status?: string }[])
          .filter(m => m.status !== 'INACTIVE')
          .map(m => m._id);
        setValue('moduleIds', activeIds);
      } else {
        setValue('moduleIds', []);
      }
    }
  }, [watchCourseId, courses, setValue]);

  useEffect(() => {
    if (watchBatchType) {
      api.get('/batches', { params: { batchType: watchBatchType, status: 'ACTIVE' } })
        .then(r => setBatches(r.data.data || [])).catch(() => {});
    }
  }, [watchBatchType]);

  const onInvalid = (fieldErrors: typeof errors) => {
    const errorKeys = Object.keys(fieldErrors) as (keyof FormData)[];
    if (errorKeys.length > 0) {
      const firstError = fieldErrors[errorKeys[0]]?.message || 'Please check the form for errors';
      toast.error(firstError);
    }
  };

  const onSubmit = async (values: FormData) => {
    try {
      const mobileClean = values.mobile.replace(/\D/g, '').slice(-10);
      const parentMobileClean = values.parentMobile?.replace(/\D/g, '').slice(-10) || mobileClean;

      const payload = {
        personalInfo: {
          name: values.name.trim(),
          address: values.address.trim(),
          mobile: mobileClean,
          parentMobile: parentMobileClean,
          dateOfBirth: values.dateOfBirth,
          email: values.email?.trim() || undefined,
          education: values.education.trim(),
        },
        enrollment: {
          courseId: values.courseId,
          moduleIds: values.moduleIds,
          joiningDate: values.joiningDate,
          courseDuration: values.courseDuration,
          batchType: values.batchType,
          batchId: values.batchId || undefined,
          batchTime: values.batchTime || undefined,
          facultyId: values.facultyId,
        },
        fees: {
          registrationFee: Number(values.registrationFee) || 100,
          courseFee: Number(values.courseFee) || 0,
        },
      };
      const { data } = await api.post('/students', payload);
      setCreatedStudentId(data.data.studentId);
      toast.success(`Student registered! ID: ${data.data.studentId}`);
      setTimeout(() => onSuccess(data.data.studentId), 1500);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to register student');
    }
  };

  if (createdStudentId) {
    return (
      <Card className="p-8 text-center border-emerald-500/30 bg-emerald-950/20">
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 font-display">Student Registered Successfully!</h2>
        <p className="text-slate-400 text-sm mb-2">Assigned Student Registration ID:</p>
        <p className="text-3xl font-bold font-mono text-gradient-primary tracking-wider">{createdStudentId}</p>
        <p className="text-xs text-slate-500 mt-4">Please note this ID for all academic tracking, fee receipts, and exam access.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {/* Personal Info */}
      <Card className="p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-5 pb-3 border-b border-white/10 flex items-center gap-2 font-display">
          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs">A</span>
          Personal Information
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input label="Full Name *" placeholder="Enter student full name" {...register('name')} error={errors.name?.message} />
          <Input label="Mobile Number *" placeholder="10-digit mobile" {...register('mobile')} error={errors.mobile?.message} />
          <Input label="Parent / Guardian Mobile *" placeholder="10-digit parent mobile" {...register('parentMobile')} error={errors.parentMobile?.message} />
          <Input label="Date of Birth *" type="date" {...register('dateOfBirth')} error={errors.dateOfBirth?.message} />
          <Input label="Email (optional)" type="email" placeholder="student@example.com" {...register('email')} error={errors.email?.message} />
          <Input label="Educational Qualification *" placeholder="e.g. B.Tech / B.Sc / 12th Pass" {...register('education')} error={errors.education?.message} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Input label="Complete Residential Address *" placeholder="Door no, Street, City, State, PIN" {...register('address')} error={errors.address?.message} />
          </div>
        </div>
      </Card>

      {/* Course Info */}
      <Card className="p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-5 pb-3 border-b border-white/10 flex items-center gap-2 font-display">
          <span className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-xs">B</span>
          Course & Curriculum Selection
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="Select Course *"
            placeholder="-- Select Course Program --"
            options={courses.filter(c => c.status === 'ACTIVE').map(c => ({ value: c._id, label: `${c.title} (${c.courseId})` }))}
            {...register('courseId')}
            error={errors.courseId?.message}
          />
          {selectedCourse && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block font-display">
                  Select Modules * <span className="text-xs text-slate-500 lowercase font-normal">(check all applicable)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = (selectedCourse.moduleIds as { _id: string; status?: string }[])
                        .filter(m => m.status !== 'INACTIVE')
                        .map(m => m._id);
                      setValue('moduleIds', allIds, { shouldValidate: true });
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600 text-[11px]">|</span>
                  <button
                    type="button"
                    onClick={() => setValue('moduleIds', [], { shouldValidate: true })}
                    className="text-[11px] text-slate-400 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="border border-white/10 rounded-xl p-3 space-y-2 max-h-44 overflow-y-auto bg-black/20">
                {(selectedCourse.moduleIds as { _id: string; title: string }[]).filter(m => (m as { status?: string }).status !== 'INACTIVE').map((mod) => (
                  <label key={mod._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors">
                    <Controller
                      name="moduleIds"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="checkbox"
                          value={mod._id}
                          checked={field.value?.includes(mod._id)}
                          onChange={e => {
                            const curr = field.value || [];
                            field.onChange(e.target.checked ? [...curr, mod._id] : curr.filter(id => id !== mod._id));
                          }}
                          className="w-4 h-4 text-indigo-600 bg-white/5 border-white/20 rounded focus:ring-indigo-500/30"
                        />
                      )}
                    />
                    <span className="text-sm text-slate-300">{mod.title}</span>
                  </label>
                ))}
              </div>
              {errors.moduleIds && <p className="text-xs text-rose-400 mt-1">{errors.moduleIds.message}</p>}
            </div>
          )}
        </div>
      </Card>

      {/* Fees & Batch Info */}
      <Card className="p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-5 pb-3 border-b border-white/10 flex items-center gap-2 font-display">
          <span className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-xs">C</span>
          Fees & Batch Schedule
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input label="Registration Fee (₹) *" type="number" defaultValue={100} {...register('registrationFee', { valueAsNumber: true })} error={errors.registrationFee?.message} />
          <Input label="Course Fee (₹) *" type="number" placeholder="0" {...register('courseFee', { valueAsNumber: true })} error={errors.courseFee?.message} />
          <Input label="Joining Date *" type="date" {...register('joiningDate')} error={errors.joiningDate?.message} />
          <Input label="Course Duration *" placeholder="e.g. 3 months / 6 months" {...register('courseDuration')} error={errors.courseDuration?.message} />
          <Select
            label="Batch Frequency *"
            options={[{ value: 'DAILY', label: 'Daily (Mon - Fri)' }, { value: 'ALTERNATE', label: 'Alternate Days (MWF / TTS)' }, { value: 'WEEKLY', label: 'Weekly (Saturday / Sunday)' }]}
            {...register('batchType')}
            error={errors.batchType?.message}
          />
          {batches.length > 0 && (
            <Select
              label="Batch Time Slot"
              placeholder="-- Select Slot --"
              options={batches.map(b => ({
                value: b._id,
                label: `${b.startTime}–${b.endTime}${b.alternateGroup ? ` (Group ${b.alternateGroup})` : ''}`
              }))}
              {...register('batchId')}
              error={errors.batchId?.message}
            />
          )}
          <Select
            label="Assigned Faculty *"
            placeholder="-- Select Instructor --"
            options={faculties.filter(f => f.status === 'ACTIVE').map(f => ({ value: f._id, label: `${f.name} (${f.facultyId})` }))}
            {...register('facultyId')}
            error={errors.facultyId?.message}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancel</Button>
        <Button type="submit" variant="gradient" loading={isSubmitting}>Register Student</Button>
      </div>
    </form>
  );
}
