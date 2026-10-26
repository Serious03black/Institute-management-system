import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Batch } from '../models/Batch';
import { writeAuditLog } from '../utils/auditLog';
import { generateStudentId } from '../utils/generators';

export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { personalInfo, enrollment, fees } = req.body;

    // Validate course and modules exist
    const course = await Course.findById(enrollment.courseId);
    if (!course) {
      res.status(400).json({ success: false, message: 'Course not found' });
      return;
    }

    const modules = await Module.find({ _id: { $in: enrollment.moduleIds } });
    if (modules.length !== enrollment.moduleIds.length) {
      res.status(400).json({ success: false, message: 'One or more modules not found' });
      return;
    }

    // Validate faculty exists
    const faculty = await Faculty.findById(enrollment.facultyId);
    if (!faculty) {
      res.status(400).json({ success: false, message: 'Faculty not found' });
      return;
    }

    // Validate batch if provided
    if (enrollment.batchId) {
      const batch = await Batch.findById(enrollment.batchId);
      if (!batch) {
        res.status(400).json({ success: false, message: 'Batch not found' });
        return;
      }
    }

    // Generate unique student ID
    let studentId = generateStudentId();
    while (await Student.findOne({ studentId })) {
      studentId = generateStudentId();
    }

    const student = await Student.create({
      studentId,
      personalInfo,
      enrollment: {
        ...enrollment,
        courseTitleSnapshot: course.title,
        moduleSnapshots: modules.map((m) => ({ moduleId: m._id, title: m.title })),
        facultyNameSnapshot: faculty.name,
      },
      fees: { registrationFee: fees?.registrationFee ?? 100, courseFee: fees?.courseFee ?? 0 },
      status: 'CURRENT',
    });

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'STUDENT_CREATED',
      entityType: 'Student',
      entityId: student.studentId,
      newValues: { studentId: student.studentId, name: personalInfo.name, courseId: enrollment.courseId },
    });

    res.status(201).json({ success: true, data: student, message: `Student registered with ID: ${studentId}` });
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string };
    if (error.code === 11000) {
      res.status(409).json({ success: false, message: 'Student ID conflict, please retry' });
    } else {
      res.status(500).json({ success: false, message: error.message || 'Failed to create student' });
    }
  }
};

export const getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      page = 1, limit = 20, status, courseId, search, batchType, facultyId,
    } = req.query;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (courseId) filter['enrollment.courseId'] = courseId;
    if (batchType) filter['enrollment.batchType'] = batchType;
    if (facultyId) filter['enrollment.facultyId'] = facultyId;
    if (search) {
      filter.$or = [
        { studentId: { $regex: search, $options: 'i' } },
        { 'personalInfo.name': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('enrollment.courseId', 'title courseId')
        .populate('enrollment.moduleIds', 'title moduleId')
        .populate('enrollment.facultyId', 'name facultyId')
        .populate('enrollment.batchId', 'batchType startTime endTime')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Student.countDocuments(filter),
    ]);

    res.json({ success: true, data: students, total, page: Number(page), limit: Number(limit) });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
};

export const getStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const student = await Student.findOne({ studentId: req.params.id })
      .populate('enrollment.courseId', 'title courseId')
      .populate('enrollment.moduleIds', 'title moduleId')
      .populate('enrollment.facultyId', 'name facultyId')
      .populate('enrollment.batchId', 'batchType startTime endTime');
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    res.json({ success: true, data: student });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch student' });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason, changes } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, message: 'A reason is required for editing student information' });
      return;
    }
    const student = await Student.findOne({ studentId: req.params.id });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    const previousValues = JSON.parse(JSON.stringify(student.toObject()));

    // Apply allowed changes
    const allowed = ['personalInfo', 'fees', 'enrollment'];
    for (const key of allowed) {
      if (changes[key]) {
        if (key === 'personalInfo') Object.assign(student.personalInfo, changes.personalInfo);
        if (key === 'fees') Object.assign(student.fees, changes.fees);
        if (key === 'enrollment') Object.assign(student.enrollment, changes.enrollment);
      }
    }

    await student.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'STUDENT_UPDATED',
      entityType: 'Student',
      entityId: student.studentId,
      previousValues,
      newValues: changes,
      reason,
    });

    res.json({ success: true, data: student, message: 'Student updated successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update student' });
  }
};

export const cancelStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason, cancellationDate } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, message: 'Cancellation reason is required' });
      return;
    }
    const student = await Student.findOne({ studentId: req.params.id });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    if (student.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Student is already cancelled' });
      return;
    }

    student.status = 'CANCELLED';
    student.cancellationDetails = {
      cancelledAt: cancellationDate ? new Date(cancellationDate) : new Date(),
      reason,
      cancelledBy: req.admin!.adminId,
    };
    await student.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'STUDENT_CANCELLED',
      entityType: 'Student',
      entityId: student.studentId,
      newValues: { reason, cancelledAt: student.cancellationDetails.cancelledAt },
      reason,
    });

    res.json({ success: true, message: 'Student cancelled successfully', data: student });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to cancel student' });
  }
};
