import express from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { getAttendanceReport, getPayrollReport, getLeaveReport } from '../controllers/reports.controller';

const router = express.Router();

// All reports restricted to HR and ADMIN
router.use(authenticateToken);
router.use(authorizeRole(['HR', 'ADMIN']));

router.get('/attendance', getAttendanceReport);
router.get('/payroll', getPayrollReport);
router.get('/leaves', getLeaveReport);

export default router;
