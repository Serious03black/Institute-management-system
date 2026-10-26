import { Router } from 'express';
import * as courseCtrl from '../controllers/course.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();
router.use(adminAuth);
router.post('/', courseCtrl.createCourse);
router.get('/', courseCtrl.getCourses);
router.get('/:id', courseCtrl.getCourse);
router.patch('/:id', courseCtrl.updateCourse);
router.post('/:id/modules', courseCtrl.addModuleToCourse);

export default router;
