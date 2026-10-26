import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as qbCtrl from '../controllers/questionBank.controller';
import { adminAuth } from '../middleware/auth';
import config from '../config';

const upload = multer({
  dest: path.join(process.cwd(), 'uploads/'),
  limits: { fileSize: config.UPLOAD_MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
});

const router = Router();
router.get('/template', qbCtrl.downloadTemplate);

router.use(adminAuth);
router.post('/upload', upload.single('file'), qbCtrl.uploadQuestionBank);
router.post('/auto-generate', qbCtrl.autoGenerateBank);
router.get('/', qbCtrl.getQuestionBanks);
router.get('/:id/questions', qbCtrl.getQuestionBankQuestions);
export default router;
