import { Router } from 'express';
import { uploadPayslip, getMyPayslips } from '../controllers/payslip.controller';
import { upload } from '../middlewares/upload.middleware';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/upload', authenticateToken, authorizeRole(['ADMIN', 'HR']), upload.single('file'), uploadPayslip);
router.get('/my-payslips', authenticateToken, getMyPayslips);

export default router;
