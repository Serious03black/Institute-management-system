import { Router } from 'express';
import * as resultsCtrl from '../controllers/results.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.use(adminAuth);
router.get('/', resultsCtrl.getAllResults);
router.get('/pending-practical', resultsCtrl.getPendingPractical);
router.get('/student/:studentId', resultsCtrl.getStudentResults);
router.post('/:attemptId/practical-evaluation', resultsCtrl.submitPracticalEvaluation);

// Re-exams
router.get('/reexams/eligible', resultsCtrl.getReexamEligible);
router.post('/reexams', resultsCtrl.createReexam);

export default router;
