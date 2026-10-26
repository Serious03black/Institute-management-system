import { Router } from 'express';
import * as settingsCtrl from '../controllers/settings.controller';
import * as auditCtrl from '../controllers/auditLog.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.use(adminAuth);
router.get('/settings', settingsCtrl.getSettings);
router.patch('/settings', settingsCtrl.updateSettings);
router.get('/audit-logs', auditCtrl.getAuditLogs);
export default router;
