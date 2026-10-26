import { Router } from 'express';
import * as dashCtrl from '../controllers/dashboard.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.get('/summary', adminAuth, dashCtrl.getDashboardSummary);
router.get('/analytics', adminAuth, dashCtrl.getDashboardAnalytics);
export default router;
