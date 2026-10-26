import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Batch } from '../models/Batch';
import { Student } from '../models/Student';
import { generateBatchId } from '../utils/generators';
import { writeAuditLog } from '../utils/auditLog';

const DAILY_SLOTS = [
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '12:00', end: '13:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' },
  { start: '17:00', end: '18:00' },
  { start: '18:00', end: '19:00' },
];

const ALTERNATE_SLOTS = [
  { start: '10:00', end: '12:00' },
  { start: '12:00', end: '14:00' },
  { start: '15:00', end: '17:00' },
  { start: '17:00', end: '19:00' },
];

export const getBatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchType, status = 'ACTIVE' } = req.query;
    const filter: Record<string, unknown> = {};
    if (batchType) filter.batchType = batchType;
    if (status) filter.status = status;
    const batches = await Batch.find(filter).sort({ batchType: 1, startTime: 1 });
    res.json({ success: true, data: batches });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch batches' });
  }
};

export const getBatchStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }
    const students = await Student.find({ 'enrollment.batchId': batch._id, status: 'CURRENT' })
      .populate('enrollment.courseId', 'title courseId')
      .populate('enrollment.facultyId', 'name facultyId')
      .select('studentId personalInfo enrollment status');
    res.json({ success: true, data: students });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch batch students' });
  }
};

export const createBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchType, alternateGroup, startTime, endTime, applicableDays, durationMinutes } = req.body;
    let batchId = generateBatchId();
    while (await Batch.findOne({ batchId })) batchId = generateBatchId();

    const batch = await Batch.create({ batchId, batchType, alternateGroup, startTime, endTime, applicableDays, durationMinutes });

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'BATCH_CREATED',
      entityType: 'Batch',
      entityId: batch.batchId,
      newValues: { batchId, batchType, startTime, endTime },
    });

    res.status(201).json({ success: true, data: batch });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create batch' });
  }
};

export const updateBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }
    res.json({ success: true, data: batch });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update batch' });
  }
};

export const getBatchSlots = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: {
      DAILY: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], slots: DAILY_SLOTS },
      ALTERNATE: {
        groupA: { days: ['Monday', 'Wednesday', 'Friday'], slots: ALTERNATE_SLOTS },
        groupB: { days: ['Tuesday', 'Thursday', 'Saturday'], slots: ALTERNATE_SLOTS },
      },
      WEEKLY: { days: ['Saturday'], note: '4-hour session, configurable time' },
    },
  });
};
