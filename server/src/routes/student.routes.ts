import { Router } from 'express';
import * as stuCtrl from '../controllers/student.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.use(adminAuth);
router.post('/', stuCtrl.createStudent);
router.get('/', stuCtrl.getStudents);
router.get('/:id', stuCtrl.getStudent);
router.patch('/:id', stuCtrl.updateStudent);
router.post('/:id/cancel', stuCtrl.cancelStudent);
export default router;
