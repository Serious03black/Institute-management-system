import { Router } from 'express';
import * as examCtrl from '../controllers/exam.controller';
import { adminAuth, examAuth } from '../middleware/auth';

const router = Router();

// Admin: credential management
router.post('/credentials', adminAuth, examCtrl.generateExamCredentials);
router.get('/credentials', adminAuth, examCtrl.getExamCredentialsList);
router.post('/credentials/:id/reset', adminAuth, examCtrl.resetExamCredentials);

// Student exam access (uses examAuth)
router.post('/access/login', examCtrl.examLogin);
router.get('/access/me', examAuth, examCtrl.getExamStudentInfo);

// Exam attempts (uses examAuth)
router.post('/attempts/start', examAuth, examCtrl.startExam);
router.get('/attempts/:id', examAuth, examCtrl.getAttempt);
router.patch('/attempts/:id/answers', examAuth, examCtrl.saveAnswers);
router.post('/attempts/:id/submit', examAuth, examCtrl.submitExam);

// Admin: exam management
router.get('/recent', adminAuth, examCtrl.getRecentExams);
router.get('/logs', adminAuth, examCtrl.getExamLogs);

export default router;
