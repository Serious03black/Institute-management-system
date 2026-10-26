import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLog.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();

router.use(adminAuth);
router.get('/', getAuditLogs);

export default router;
