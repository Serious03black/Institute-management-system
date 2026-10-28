import { Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middleware/auth';
import { ExamCredential } from '../models/ExamCredential';
import { Student } from '../models/Student';
import { Module } from '../models/Module';
import { ExamAttempt } from '../models/ExamAttempt';
import { Question } from '../models/Question';
import { Settings } from '../models/Settings';
import { writeAuditLog } from '../utils/auditLog';
import { generateExamUsername, generatePassword, generateAttemptId, shuffleArray } from '../utils/generators';
import config from '../config';
import mongoose from 'mongoose';
import { isDbConnected } from '../config/database';

// ===================== EXAM CREDENTIALS =====================

export const generateExamCredentials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.body;
    const student = await Student.findOne({ studentId }).populate('enrollment.moduleIds', 'title moduleId');
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    if (student.status === 'CANCELLED') {
      res.status(400).json({ success: false, message: 'Cancelled students cannot receive exam credentials' });
      return;
    }

    // Check if credentials already exist
    const existing = await ExamCredential.findOne({ studentId: student._id });
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Exam credentials already exist for this student. Use reset to regenerate.',
        data: { examUsername: existing.examUsername },
      });
      return;
    }

    const examUsername = generateExamUsername(student.studentId);
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const cred = await ExamCredential.create({
      examUsername,
      studentId: student._id,
      passwordHash,
      allowedModuleIds: student.enrollment.moduleIds,
      status: 'ACTIVE',
    });

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'EXAM_CREDENTIALS_GENERATED',
      entityType: 'ExamCredential',
      entityId: cred._id.toString(),
      newValues: { studentId: student.studentId, examUsername },
    });

    // Return plain password once — Admin must communicate it to student
    res.status(201).json({
      success: true,
      message: 'Exam credentials generated',
      data: { examUsername, password: plainPassword, studentName: student.personalInfo.name },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to generate exam credentials' });
  }
};

export const resetExamCredentials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cred = await ExamCredential.findById(req.params.id);
    if (!cred) {
      res.status(404).json({ success: false, message: 'Credentials not found' });
      return;
    }
    const plainPassword = generatePassword();
    cred.passwordHash = await bcrypt.hash(plainPassword, 12);
    cred.status = 'ACTIVE';
    await cred.save();

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'EXAM_CREDENTIALS_RESET',
      entityType: 'ExamCredential',
      entityId: cred._id.toString(),
      newValues: { examUsername: cred.examUsername },
    });

    res.json({
      success: true,
      message: 'Credentials reset',
      data: { examUsername: cred.examUsername, password: plainPassword },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to reset credentials' });
  }
};

export const getExamCredentialsList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let studentFilter: Record<string, unknown> = {};
    if (search) {
      studentFilter = { $or: [{ studentId: { $regex: search, $options: 'i' } }, { 'personalInfo.name': { $regex: search, $options: 'i' } }] };
    }
    const students = await Student.find(studentFilter).select('_id studentId personalInfo enrollment');
    const studentIds = students.map((s) => s._id);

    const [creds, total] = await Promise.all([
      ExamCredential.find({ studentId: { $in: studentIds } })
        .populate({ path: 'studentId', select: 'studentId personalInfo enrollment' })
        .populate('allowedModuleIds', 'title moduleId')
        .skip(skip)
        .limit(Number(limit)),
      ExamCredential.countDocuments({ studentId: { $in: studentIds } }),
    ]);

    res.json({ success: true, data: creds, total, page: Number(page) });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch credentials' });
  }
};

// ===================== EXAM ACCESS (Student-Facing) =====================

export const examLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isDbConnected()) {
      res.status(503).json({
        success: false,
        message: 'Database is not connected. Please provide a valid MongoDB Atlas connection string in server/.env',
      });
      return;
    }
    const { examUsername, password } = req.body;
    const cred = await ExamCredential.findOne({ examUsername })
      .select('+passwordHash')
      .populate({ path: 'studentId', populate: { path: 'enrollment.moduleIds', select: 'title moduleId' } });

    if (!cred || cred.status !== 'ACTIVE') {
      res.status(401).json({ success: false, message: 'Invalid credentials or account disabled' });
      return;
    }

    const valid = await bcrypt.compare(password, cred.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const student = cred.studentId as unknown as { _id: string; studentId: string; personalInfo: { name: string } };
    const payload = { studentId: student._id.toString(), examUsername };
    const token = jwt.sign(payload, config.JWT_SECRET + '_exam', { expiresIn: '4h' });

    const isProd = config.NODE_ENV === 'production';
    res.cookie('examToken', token, { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', maxAge: 4 * 60 * 60 * 1000 });

    res.json({ success: true, data: { token, studentInfo: cred.studentId } });
  } catch {
    res.status(500).json({ success: false, message: 'Exam login failed' });
  }
};

export const getExamStudentInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const examStudent = req.examStudent!;
    const student = await Student.findById(examStudent.studentId)
      .populate('enrollment.courseId', 'title courseId')
      .populate('enrollment.moduleIds', 'title moduleId');
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    // Get exam status for each module
    const moduleStatuses = await Promise.all(
      student.enrollment.moduleIds.map(async (modId) => {
        const latestAttempt = await ExamAttempt.findOne({
          studentId: student._id,
          moduleId: modId,
          attemptStatus: { $in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] },
        }).sort({ createdAt: -1 });

        const inProgress = await ExamAttempt.findOne({
          studentId: student._id,
          moduleId: modId,
          attemptStatus: 'IN_PROGRESS',
          deadline: { $gt: new Date() },
        });

        return {
          moduleId: modId,
          status: inProgress ? 'IN_PROGRESS' : latestAttempt ? 'COMPLETED' : 'PENDING',
          attemptId: inProgress?._id || latestAttempt?._id,
        };
      })
    );

    res.json({ success: true, data: { student, moduleStatuses } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to get student info' });
  }
};

// ===================== EXAM ATTEMPTS =====================

export const startExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const examStudent = req.examStudent!;
    const { moduleId: moduleIdStr } = req.body;

    const student = await Student.findById(examStudent.studentId);
    if (!student || student.status === 'CANCELLED') {
      res.status(403).json({ success: false, message: 'Student is not eligible for exams' });
      return;
    }

    const module = await Module.findOne({ moduleId: moduleIdStr });
    if (!module) {
      res.status(404).json({ success: false, message: 'Module not found' });
      return;
    }

    // Verify student is enrolled in this module
    const isEnrolled = student.enrollment.moduleIds.some((id) => id.toString() === module._id.toString());
    if (!isEnrolled) {
      res.status(403).json({ success: false, message: 'Student is not enrolled in this module' });
      return;
    }

    // Check for active attempt
    const existingActive = await ExamAttempt.findOne({
      studentId: student._id,
      moduleId: module._id,
      attemptStatus: 'IN_PROGRESS',
      deadline: { $gt: new Date() },
    });

    if (existingActive) {
      res.status(409).json({
        success: false,
        message: 'An active exam attempt exists. Please resume instead.',
        data: { attemptId: existingActive.attemptId },
      });
      return;
    }

    // Check if already completed
    const completedAttempt = await ExamAttempt.findOne({
      studentId: student._id,
      moduleId: module._id,
      attemptStatus: { $in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] },
      attemptType: 'REGULAR',
    });

    if (completedAttempt) {
      res.status(409).json({
        success: false,
        message: 'Regular exam already completed for this module. Re-exam must be authorized.',
      });
      return;
    }

    // Get settings for question distribution
    const settings = await Settings.findOne({ key: 'APP_SETTINGS' });
    const dist = settings?.exam?.questionDistribution || { basic: 10, mid: 10, advanced: 20, practical: 2 };
    const durationMs = (settings?.exam?.durationMinutes || 60) * 60 * 1000;

    // Verify question bank exists for this module
    const totalModuleQuestions = await Question.countDocuments({ moduleId: module._id, status: 'ACTIVE' });
    if (totalModuleQuestions === 0) {
      res.status(400).json({
        success: false,
        message: `The question bank for module "${module.title}" has not been uploaded yet. Please contact your faculty or administrator to upload or generate questions.`,
      });
      return;
    }

    // Select random questions from bank with graceful fallback
    const selectRandom = async (section: string, count: number) => {
      const all = await Question.find({ moduleId: module._id, section, status: 'ACTIVE' }).select('+correctOption');
      if (all.length === 0) return [];
      const takeCount = Math.min(all.length, count);
      return shuffleArray(all).slice(0, takeCount);
    };

    const [basic, mid, advanced, practical] = await Promise.all([
      selectRandom('BASIC', dist.basic),
      selectRandom('MID', dist.mid),
      selectRandom('ADVANCED', dist.advanced),
      selectRandom('PRACTICAL', dist.practical),
    ]);

    const allQuestions = shuffleArray([...basic, ...mid, ...advanced, ...practical]);
    if (allQuestions.length === 0) {
      res.status(400).json({
        success: false,
        message: `No active questions found for module "${module.title}". Please notify your administrator.`,
      });
      return;
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + durationMs);
    const attemptId = generateAttemptId();

    const attempt = await ExamAttempt.create({
      attemptId,
      studentId: student._id,
      courseId: student.enrollment.courseId,
      moduleId: module._id,
      attemptType: 'REGULAR',
      selectedQuestions: allQuestions.map((q) => ({
        questionId: q._id,
        section: q.section,
        questionText: q.questionText,
        options: q.options,
        maximumMarks: q.maximumMarks,
      })),
      questionOrder: allQuestions.map((q) => q._id),
      startTime: now,
      deadline,
      answers: [],
      attemptStatus: 'IN_PROGRESS',
    });

    await writeAuditLog({
      actorId: student.studentId,
      actorType: 'SYSTEM',
      action: 'EXAM_STARTED',
      entityType: 'ExamAttempt',
      entityId: attempt.attemptId,
      newValues: { studentId: student.studentId, moduleId: module.moduleId, attemptType: 'REGULAR' },
    });

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt.attemptId,
        questions: attempt.selectedQuestions, // correctOption excluded by default
        questionOrder: attempt.questionOrder,
        startTime: attempt.startTime,
        deadline: attempt.deadline,
        durationMinutes: settings?.exam?.durationMinutes || 60,
      },
    });
  } catch (err) {
    const error = err as Error;
    res.status(400).json({ success: false, message: error.message || 'Failed to start exam' });
  }
};

export const getAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const examStudent = req.examStudent!;
    const attempt = await ExamAttempt.findOne({ attemptId: req.params.id });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Attempt not found' });
      return;
    }
    if (attempt.studentId.toString() !== examStudent.studentId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    // Auto-submit if timed out
    if (attempt.attemptStatus === 'IN_PROGRESS' && new Date() > attempt.deadline) {
      attempt.attemptStatus = 'AUTO_SUBMITTED';
      attempt.submissionTime = attempt.deadline;
      await attempt.save();
      await evaluateObjective(attempt._id.toString());
    }
    res.json({ success: true, data: attempt });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to get attempt' });
  }
};

export const saveAnswers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const examStudent = req.examStudent!;
    const { answers } = req.body; // Array of { questionId, selectedOption?, codeAnswer? }

    const attempt = await ExamAttempt.findOne({ attemptId: req.params.id });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Attempt not found' });
      return;
    }
    if (attempt.studentId.toString() !== examStudent.studentId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    if (attempt.attemptStatus !== 'IN_PROGRESS') {
      res.status(400).json({ success: false, message: 'Exam is no longer active' });
      return;
    }
    if (new Date() > attempt.deadline) {
      attempt.attemptStatus = 'AUTO_SUBMITTED';
      attempt.submissionTime = attempt.deadline;
      await attempt.save();
      await evaluateObjective(attempt._id.toString());
      res.status(400).json({ success: false, message: 'Exam time has expired and was auto-submitted' });
      return;
    }

    // Merge incoming answers
    if (Array.isArray(answers)) {
      for (const ans of answers) {
        const existing = attempt.answers.find((a) => a.questionId.toString() === ans.questionId);
        if (existing) {
          if (ans.selectedOption !== undefined) existing.selectedOption = ans.selectedOption;
          if (ans.codeAnswer !== undefined) existing.codeAnswer = ans.codeAnswer;
          existing.savedAt = new Date();
        } else {
          attempt.answers.push({ ...ans, savedAt: new Date() });
        }
      }
    }
    await attempt.save();
    res.json({ success: true, message: 'Answers saved', answeredCount: attempt.answers.length });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to save answers' });
  }
};

export const submitExam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const examStudent = req.examStudent!;
    const attempt = await ExamAttempt.findOne({ attemptId: req.params.id });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Attempt not found' });
      return;
    }
    if (attempt.studentId.toString() !== examStudent.studentId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    if (attempt.attemptStatus !== 'IN_PROGRESS') {
      res.status(400).json({ success: false, message: 'Exam already submitted' });
      return;
    }

    const now = new Date();
    attempt.submissionTime = now > attempt.deadline ? attempt.deadline : now;
    attempt.attemptStatus = now > attempt.deadline ? 'AUTO_SUBMITTED' : 'SUBMITTED';
    attempt.durationSeconds = Math.round((attempt.submissionTime.getTime() - attempt.startTime.getTime()) / 1000);
    await attempt.save();

    await evaluateObjective(attempt._id.toString());

    await writeAuditLog({
      actorId: examStudent.studentId,
      actorType: 'SYSTEM',
      action: 'EXAM_SUBMITTED',
      entityType: 'ExamAttempt',
      entityId: attempt.attemptId,
    });

    res.json({ success: true, message: 'Exam submitted successfully', data: { attemptId: attempt.attemptId } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to submit exam' });
  }
};

// Internal: evaluate objective questions
async function evaluateObjective(attemptMongoId: string): Promise<void> {
  const attempt = await ExamAttempt.findById(attemptMongoId);
  if (!attempt) return;

  // Fetch questions WITH correctOption
  const questionIds = attempt.selectedQuestions.map((q) => q.questionId);
  const questions = await Question.find({ _id: { $in: questionIds } }).select('+correctOption');
  const qMap = new Map(questions.map((q) => [q._id.toString(), q.correctOption]));

  let correct = 0, incorrect = 0, unanswered = 0, totalMarks = 0;
  const objectiveQs = attempt.selectedQuestions.filter((q) => q.section !== 'PRACTICAL');

  for (const sq of objectiveQs) {
    const ans = attempt.answers.find((a) => a.questionId.toString() === sq.questionId.toString());
    const correctOpt = qMap.get(sq.questionId.toString());
    if (!ans?.selectedOption) {
      unanswered++;
    } else if (ans.selectedOption === correctOpt) {
      correct++;
      totalMarks += sq.maximumMarks;
    } else {
      incorrect++;
    }
  }

  attempt.objectiveEvaluation = {
    totalObjectiveQuestions: objectiveQs.length,
    answeredCorrectly: correct,
    answeredIncorrectly: incorrect,
    unanswered,
    totalObjectiveMarks: totalMarks,
    evaluatedAt: new Date(),
  };
  attempt.practicalEvaluationStatus = 'PENDING';
  await attempt.save();
}

export const getRecentExams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [attempts, total] = await Promise.all([
      ExamAttempt.find({ attemptStatus: { $in: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'] } })
        .populate('studentId', 'studentId personalInfo.name enrollment.courseTitleSnapshot')
        .populate('moduleId', 'title moduleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ExamAttempt.countDocuments({ attemptStatus: { $in: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'] } }),
    ]);
    res.json({ success: true, data: attempts, total });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch recent exams' });
  }
};

export const getExamLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, studentId, moduleId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};

    if (studentId) {
      const student = await Student.findOne({ studentId: studentId as string });
      if (student) filter.studentId = student._id;
    }
    if (moduleId) {
      const mod = await Module.findOne({ moduleId: moduleId as string });
      if (mod) filter.moduleId = mod._id;
    }

    const [attempts, total] = await Promise.all([
      ExamAttempt.find(filter)
        .populate('studentId', 'studentId personalInfo.name enrollment.courseTitleSnapshot')
        .populate('moduleId', 'title moduleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ExamAttempt.countDocuments(filter),
    ]);
    res.json({ success: true, data: attempts, total });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch exam logs' });
  }
};
