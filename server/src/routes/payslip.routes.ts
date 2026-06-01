import { Router } from 'express';
import { uploadPayslip, getMyPayslips } from '../controllers/payslip.controller';
import { upload } from '../middlewares/upload.middleware';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadPayslipSchema } from '../validators/schemas';

const router = Router();

// validate runs after multer so the multipart body fields are parsed first.
router.post('/upload', authenticateToken, requirePermission('MANAGE_PAYROLL'), upload.single('file'), validate({ body: uploadPayslipSchema }), uploadPayslip);
router.get('/my-payslips', authenticateToken, getMyPayslips);

export default router;
