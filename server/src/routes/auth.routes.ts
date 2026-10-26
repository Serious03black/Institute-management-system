import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();

router.post('/login', authCtrl.login);
router.post('/refresh', authCtrl.refresh);
router.post('/logout', adminAuth, authCtrl.logout);
router.get('/me', adminAuth, authCtrl.getMe);
router.post('/change-credentials', adminAuth, authCtrl.changeCredentials);
router.patch('/profile', adminAuth, authCtrl.updateProfile);

export default router;
