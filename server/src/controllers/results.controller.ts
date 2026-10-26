import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ExamAttempt } from '../models/ExamAttempt';
import { PracticalEvaluation } from '../models/PracticalEvaluation';
import { ModuleResult } from '../models/ModuleResult';
import { Student } from '../models/Student';
import { Module } from '../models/Module';
import { Settings } from '../models/Settings';
import { writeAuditLog } from '../utils/auditLog';

export const getPendingPractical = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [attempts, total] = await Promise.all([
      ExamAttempt.find({
        attemptStatus: { $in: ['SUBMITTED', 'AUTO_SUBMITTED', 'EVALUATED'] },
        practicalEvaluationStatus: 'PENDING',
      })
        .populate('studentId', 'studentId personalInfo.name enrollment.courseTitleSnapshot')
        .populate('moduleId', 'title moduleId')
        .sort({ submissionTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ExamAttempt.countDocuments({
        attemptStatus: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        practicalEvaluationStatus: 'PENDING',
      }),
    ]);

    res.json({ success: true, data: attempts, total });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch pending practical evaluations' });
  }
};

export const submitPracticalEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { questionEvaluations } = req.body;

    const attempt = await ExamAttempt.findOne({ attemptId });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Attempt not found' });
      return;
    }
    if (attempt.practicalEvaluationStatus === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Practical evaluation already completed' });
      return;
    }

    const settings = await Settings.findOne({ key: 'APP_SETTINGS' });
    const practicalMaxPerQ = (settings?.exam?.practicalMaxMarks || 10) / 2; // per question

    // Validate marks
    let totalAwarded = 0;
    for (const qe of questionEvaluations) {
      if (qe.awardedMarks > practicalMaxPerQ || qe.awardedMarks < 0) {
        res.status(400).json({
          success: false,
          message: `Marks for question must be between 0 and ${practicalMaxPerQ}`,
        });
        return;
      }
      totalAwarded += qe.awardedMarks;
    }

    const existingEval = await PracticalEvaluation.findOne({ attemptId: attempt._id });
    if (existingEval && existingEval.status === 'COMPLETED') {
      res.status(400).json({ success: false, message: 'Evaluation already finalized' });
      return;
    }

    if (existingEval) {
      // Correction
      existingEval.correctionHistory.push({
        correctedBy: req.admin!.adminId,
        correctedAt: new Date(),
        reason: req.body.reason || 'Admin correction',
        previousMarks: existingEval.totalAwardedMarks,
        newMarks: totalAwarded,
      });
      existingEval.questionEvaluations = questionEvaluations;
      existingEval.totalAwardedMarks = totalAwarded;
      existingEval.evaluatedBy = req.admin!.adminId;
      existingEval.evaluatedAt = new Date();
      existingEval.status = 'COMPLETED';
      await existingEval.save();
    } else {
      // New evaluation
      const practicalQs = attempt.selectedQuestions.filter((q) => q.section === 'PRACTICAL');
      const enrichedQEs = questionEvaluations.map((qe: { questionId: string; isCorrect: boolean; awardedMarks: number; comment?: string }, idx: number) => ({
        ...qe,
        questionText: practicalQs[idx]?.questionText || '',
        submittedCode: attempt.answers.find((a) => a.questionId.toString() === qe.questionId)?.codeAnswer || '',
        maximumMarks: practicalMaxPerQ,
      }));

      await PracticalEvaluation.create({
        attemptId: attempt._id,
        studentId: attempt.studentId,
        moduleId: attempt.moduleId,
        questionEvaluations: enrichedQEs,
        totalAwardedMarks: totalAwarded,
        maximumMarks: settings?.exam?.practicalMaxMarks || 10,
        evaluatedBy: req.admin!.adminId,
        evaluatedAt: new Date(),
        status: 'COMPLETED',
      });
    }

    attempt.practicalEvaluationStatus = 'COMPLETED';
    await attempt.save();

    // Finalize module result
    await finalizeModuleResult(attempt._id.toString(), req.admin!.adminId);

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'PRACTICAL_EVALUATED',
      entityType: 'ExamAttempt',
      entityId: attempt.attemptId,
      newValues: { totalPracticalMarks: totalAwarded },
    });

    res.json({ success: true, message: 'Practical evaluation submitted and result finalized' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to submit practical evaluation' });
  }
};

async function finalizeModuleResult(attemptMongoId: string, adminId: string): Promise<void> {
  const attempt = await ExamAttempt.findById(attemptMongoId);
  if (!attempt) return;

  const practEval = await PracticalEvaluation.findOne({ attemptId: attempt._id });
  const settings = await Settings.findOne({ key: 'APP_SETTINGS' });
  const passingMarks = settings?.exam?.passingMarks || 40;

  const objectiveMarks = attempt.objectiveEvaluation?.totalObjectiveMarks || 0;
  const practicalMarks = practEval?.totalAwardedMarks || 0;
  const totalMarks = objectiveMarks + practicalMarks;
  const maxObjective = (attempt.objectiveEvaluation?.totalObjectiveQuestions || 0) * 2;
  const maxPractical = settings?.exam?.practicalMaxMarks || 10;
  const maximumMarks = maxObjective + maxPractical;

  const status: 'PASS' | 'FAIL' = totalMarks >= passingMarks ? 'PASS' : 'FAIL';

  await ModuleResult.findOneAndUpdate(
    { studentId: attempt.studentId, moduleId: attempt.moduleId },
    {
      latestValidAttemptId: attempt._id,
      objectiveMarks,
      practicalMarks,
      totalMarks,
      maximumMarks,
      passingMarks,
      status,
      finalizedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  attempt.attemptStatus = 'EVALUATED';
  await attempt.save();

  await writeAuditLog({
    actorId: adminId,
    action: 'RESULT_FINALIZED',
    entityType: 'ModuleResult',
    entityId: `${attempt.studentId}-${attempt.moduleId}`,
    newValues: { totalMarks, status },
  });
}

export const getStudentResults = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const student = await Student.findOne({ studentId }).populate('enrollment.moduleIds', 'title moduleId');
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const results = await ModuleResult.find({ studentId: student._id })
      .populate('moduleId', 'title moduleId')
      .populate('courseId', 'title courseId')
      .populate('latestValidAttemptId');

    const allAttempts = await ExamAttempt.find({ studentId: student._id })
      .populate('moduleId', 'title moduleId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { student, results, allAttempts } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
};

export const getAllResults = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const [results, total] = await Promise.all([
      ModuleResult.find(filter)
        .populate('studentId', 'studentId personalInfo.name')
        .populate('moduleId', 'title moduleId')
        .populate('courseId', 'title courseId')
        .skip(skip)
        .limit(Number(limit))
        .sort({ finalizedAt: -1 }),
      ModuleResult.countDocuments(filter),
    ]);
    res.json({ success: true, data: results, total });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
};

// Re-exam
export const getReexamEligible = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.query;
    let filter: Record<string, unknown> = { status: 'FAIL' };
    if (studentId) {
      const student = await Student.findOne({ studentId: studentId as string });
      if (student) filter.studentId = student._id;
    }
    const failedResults = await ModuleResult.find(filter)
      .populate('studentId', 'studentId personalInfo.name enrollment.courseTitleSnapshot')
      .populate('moduleId', 'title moduleId');
    res.json({ success: true, data: failedResults });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch re-exam eligible students' });
  }
};

export const createReexam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId, moduleId: moduleIdStr } = req.body;

    const student = await Student.findOne({ studentId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const module = await Module.findOne({ moduleId: moduleIdStr });
    if (!module) {
      res.status(404).json({ success: false, message: 'Module not found' });
      return;
    }

    const result = await ModuleResult.findOne({ studentId: student._id, moduleId: module._id });
    if (!result || result.status !== 'FAIL') {
      res.status(400).json({ success: false, message: 'Re-exam only allowed for failed modules' });
      return;
    }

    // Check for active re-exam attempt
    const activeReexam = await ExamAttempt.findOne({
      studentId: student._id,
      moduleId: module._id,
      attemptType: 'REEXAM',
      attemptStatus: 'IN_PROGRESS',
      deadline: { $gt: new Date() },
    });
    if (activeReexam) {
      res.status(409).json({ success: false, message: 'Active re-exam attempt already exists' });
      return;
    }

    await writeAuditLog({
      actorId: req.admin!.adminId,
      action: 'REEXAM_CREATED',
      entityType: 'ExamAttempt',
      entityId: `${student.studentId}-${module.moduleId}`,
      newValues: { studentId: student.studentId, moduleId: module.moduleId },
    });

    res.json({ success: true, message: 'Re-exam authorized. Student can now start the re-exam.', data: { studentId, moduleId: moduleIdStr } });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create re-exam' });
  }
};
