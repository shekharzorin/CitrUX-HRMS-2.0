import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { updateSalary, getSalary, generatePayslip } from '../controllers/salary.controller';
import { getMyPayslips } from '../controllers/payslip.controller';

const router = Router();

router.use(authenticateToken);

router.post('/structure', authorizeRole(['ADMIN', 'HR']), updateSalary);
router.get('/structure/:userId', authorizeRole(['ADMIN', 'HR']), getSalary);
router.post('/generate', authorizeRole(['ADMIN', 'HR']), generatePayslip);
// Reuse existing controller logic for listing
router.get('/my', getMyPayslips);

export default router;
