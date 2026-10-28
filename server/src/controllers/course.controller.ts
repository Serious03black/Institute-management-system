import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Course } from '../models/Course';
import { Module } from '../models/Module';
import { Student } from '../models/Student';
import { writeAuditLog } from '../utils/auditLog';
import { generateCourseId, generateModuleId } from '../utils/generators';

export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, modules: moduleTitles } = req.body;
    let courseId = generateCourseId();
    while (await Course.findOne({ courseId })) courseId = generateCourseId();

    const course = await Course.create({ courseId, title, description, moduleIds: [] });

    // Create modules
    const createdModuleIds: string[] = [];
    if (Array.isArray(moduleTitles)) {
      for (const moduleTitle of moduleTitles) {
        let moduleId = generateModuleId();
        while (await Module.findOne({ moduleId })) moduleId = generateModuleId();
        const mod = await Module.create({ moduleId, title: moduleTitle, courseId: course._id });
        course.moduleIds.push(mod._id as never);
        createdModuleIds.push(mod.moduleId);
      }
    }
    await course.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'COURSE_CREATED',
      entityType: 'Course',
      entityId: course.courseId,
      newValues: { courseId: course.courseId, title, modules: createdModuleIds },
    });

    res.status(201).json({ success: true, data: await course.populate('moduleIds') });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create course' });
  }
};

export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }];
    const courses = await Course.find(filter)
      .populate('moduleIds', 'title moduleId status questionBankId')
      .sort({ createdAt: -1 });

    // Add enrolled student count
    const enriched = await Promise.all(
      courses.map(async (c) => {
        const count = await Student.countDocuments({ 'enrollment.courseId': c._id, status: { $ne: 'CANCELLED' } });
        return { ...c.toObject(), enrolledStudents: count };
      })
    );

    res.json({ success: true, data: enriched });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
};

export const getCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const course = await Course.findOne({ courseId: req.params.id }).populate('moduleIds', 'title moduleId status');
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const enrolledStudents = await Student.countDocuments({ 'enrollment.courseId': course._id, status: { $ne: 'CANCELLED' } });
    res.json({ success: true, data: { ...course.toObject(), enrolledStudents } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch course' });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason, title, description, status } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, message: 'A reason is required for editing course' });
      return;
    }
    const course = await Course.findOne({ courseId: req.params.id });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    const prev = { title: course.title, description: course.description, status: course.status };
    if (title) course.title = title;
    if (description !== undefined) course.description = description;
    if (status) course.status = status;
    await course.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'COURSE_UPDATED',
      entityType: 'Course',
      entityId: course.courseId,
      previousValues: prev,
      newValues: { title, description, status },
      reason,
    });

    res.json({ success: true, data: course });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update course' });
  }
};

export const addModuleToCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title } = req.body;
    const course = await Course.findOne({ courseId: req.params.id });
    if (!course) {
      res.status(404).json({ success: false, message: 'Course not found' });
      return;
    }
    let moduleId = generateModuleId();
    while (await Module.findOne({ moduleId })) moduleId = generateModuleId();
    const mod = await Module.create({ moduleId, title, courseId: course._id });
    course.moduleIds.push(mod._id as never);
    await course.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'MODULE_ADDED',
      entityType: 'Module',
      entityId: mod.moduleId,
      newValues: { moduleId: mod.moduleId, title, courseId: course.courseId },
    });

    res.status(201).json({ success: true, data: mod });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to add module' });
  }
};

export const updateModule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason, title, status } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, message: 'A reason is required' });
      return;
    }
    const mod = await Module.findOne({ moduleId: req.params.id });
    if (!mod) {
      res.status(404).json({ success: false, message: 'Module not found' });
      return;
    }
    const prev = { title: mod.title, status: mod.status };
    if (title) mod.title = title;
    if (status) mod.status = status;
    await mod.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'MODULE_UPDATED',
      entityType: 'Module',
      entityId: mod.moduleId,
      previousValues: prev,
      newValues: { title, status },
      reason,
    });

    res.json({ success: true, data: mod });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update module' });
  }
};

export const getModules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.query;
    const filter: Record<string, unknown> = {};
    if (courseId) {
      const course = await Course.findOne({ courseId: courseId as string });
      if (course) filter.courseId = course._id;
    }
    const modules = await Module.find(filter).populate('courseId', 'title courseId');
    res.json({ success: true, data: modules });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch modules' });
  }
};
