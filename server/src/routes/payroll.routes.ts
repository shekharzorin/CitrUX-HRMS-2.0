import express from 'express';
import { 
    calculatePayroll, generatePayroll, listPayslips, downloadPayslip, getPayrollStats,
    validateIFSC, getPayrollInfo, updatePayrollInfo
} from '../controllers/payroll.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

// Admin / HR only routes
const adminOnly = requirePermission('MANAGE_PAYROLL');

router.post('/calculate', adminOnly, calculatePayroll);
router.post('/generate', adminOnly, generatePayroll);
router.get('/list', adminOnly, listPayslips);
router.get('/stats', adminOnly, getPayrollStats);

// Mixed access routes (controlled in controller)
router.get('/:id/download', downloadPayslip);
router.get('/ifsc/:ifsc', validateIFSC);
router.get('/info/:userId', getPayrollInfo);
router.put('/info/:userId', updatePayrollInfo);

export default router;
