import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Faculty } from '../models/Faculty';
import { writeAuditLog } from '../utils/auditLog';
import { generateFacultyId } from '../utils/generators';

export const createFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    let facultyId = generateFacultyId();
    while (await Faculty.findOne({ facultyId })) {
      facultyId = generateFacultyId();
    }
    const faculty = await Faculty.create({ ...data, facultyId });

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'FACULTY_CREATED',
      entityType: 'Faculty',
      entityId: faculty.facultyId,
      newValues: { facultyId: faculty.facultyId, name: faculty.name },
    });

    res.status(201).json({ success: true, data: faculty, message: `Faculty registered with ID: ${facultyId}` });
  } catch (err: unknown) {
    const error = err as { message?: string };
    res.status(500).json({ success: false, message: error.message || 'Failed to create faculty' });
  }
};

export const getFaculties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, search, courseId, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (courseId) filter.teachingCourseIds = courseId;
    if (search) {
      filter.$or = [
        { facultyId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [faculties, total] = await Promise.all([
      Faculty.find(filter)
        .populate('teachingCourseIds', 'title courseId')
        .populate('teachingModuleIds', 'title moduleId')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Faculty.countDocuments(filter),
    ]);
    res.json({ success: true, data: faculties, total, page: Number(page), limit: Number(limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch faculties' });
  }
};

export const getFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const faculty = await Faculty.findOne({ facultyId: req.params.id })
      .populate('teachingCourseIds', 'title courseId')
      .populate('teachingModuleIds', 'title moduleId');
    if (!faculty) {
      res.status(404).json({ success: false, message: 'Faculty not found' });
      return;
    }
    res.json({ success: true, data: faculty });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch faculty' });
  }
};

export const updateFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason, ...changes } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, message: 'A reason is required for editing faculty' });
      return;
    }
    const faculty = await Faculty.findOne({ facultyId: req.params.id });
    if (!faculty) {
      res.status(404).json({ success: false, message: 'Faculty not found' });
      return;
    }
    const prev = JSON.parse(JSON.stringify(faculty.toObject()));
    Object.assign(faculty, changes);
    await faculty.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'FACULTY_UPDATED',
      entityType: 'Faculty',
      entityId: faculty.facultyId,
      previousValues: prev,
      newValues: changes,
      reason,
    });

    res.json({ success: true, data: faculty });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update faculty' });
  }
};
