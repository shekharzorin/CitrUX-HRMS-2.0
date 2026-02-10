import express from 'express';
import { calculatePayroll, generatePayroll, listPayslips, downloadPayslip, getPayrollStats } from '../controllers/payroll.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = express.Router();

// All routes require Admin or HR role for now
router.use(authenticateToken);
router.use(authorizeRole(['ADMIN', 'HR']));

router.post('/calculate', calculatePayroll);
router.post('/generate', generatePayroll);
router.get('/list', listPayslips);
router.get('/:id/download', downloadPayslip);
router.get('/stats', getPayrollStats);

export default router;
