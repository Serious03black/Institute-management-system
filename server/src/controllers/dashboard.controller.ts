import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Student } from '../models/Student';
import { Faculty } from '../models/Faculty';
import { Course } from '../models/Course';
import { Batch } from '../models/Batch';
import { ExamAttempt } from '../models/ExamAttempt';
import { ModuleResult } from '../models/ModuleResult';

export const getDashboardSummary = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalStudents,
      currentStudents,
      completedStudents,
      cancelledStudents,
      totalFaculty,
      totalCourses,
      activeBatches,
      passedStudents,
      failedStudents,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ status: 'CURRENT' }),
      Student.countDocuments({ status: 'COMPLETED' }),
      Student.countDocuments({ status: 'CANCELLED' }),
      Faculty.countDocuments({ status: 'ACTIVE' }),
      Course.countDocuments({ status: 'ACTIVE' }),
      Batch.countDocuments({ status: 'ACTIVE' }),
      ModuleResult.countDocuments({ status: 'PASS' }),
      ModuleResult.countDocuments({ status: 'FAIL' }),
    ]);

    // Students with pending exams (modules not yet attempted)
    const studentsWithPendingExams = await Student.countDocuments({
      status: 'CURRENT',
    });

    res.json({
      success: true,
      data: {
        totalStudents,
        currentStudents,
        completedStudents,
        cancelledStudents,
        totalFaculty,
        totalCourses,
        activeBatches,
        studentsWithPendingExams,
        passedStudents,
        failedStudents,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary' });
  }
};

export const getDashboardAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Enrollment trend - last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enrollmentTrend = await Student.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Course distribution
    const courseDistribution = await Student.aggregate([
      { $match: { status: { $in: ['CURRENT', 'COMPLETED'] } } },
      { $group: { _id: '$enrollment.courseTitleSnapshot', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Recent registrations
    const recentRegistrations = await Student.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('studentId personalInfo.name enrollment.courseTitleSnapshot status createdAt');

    // Recent exam attempts
    const recentExamAttempts = await ExamAttempt.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('studentId', 'studentId personalInfo.name')
      .populate('moduleId', 'title');

    // Status distribution
    const statusDistribution = [
      { name: 'Current', value: await Student.countDocuments({ status: 'CURRENT' }) },
      { name: 'Completed', value: await Student.countDocuments({ status: 'COMPLETED' }) },
      { name: 'Cancelled', value: await Student.countDocuments({ status: 'CANCELLED' }) },
    ];

    res.json({
      success: true,
      data: {
        enrollmentTrend,
        courseDistribution,
        recentRegistrations,
        recentExamAttempts,
        statusDistribution,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard analytics' });
  }
};
