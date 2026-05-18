import { Router } from 'express';
import { punchIn, punchOut, getAttendance, getAllAttendance, startBreak, endBreak, requestAdjustment, getPendingAdjustments, respondToAdjustment, overrideAttendance } from '../controllers/attendance.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.post('/punch-in', authenticateToken, punchIn);
router.post('/punch-out', authenticateToken, punchOut);
router.post('/break/start', authenticateToken, startBreak);
router.post('/break/end', authenticateToken, endBreak);
router.post('/adjust', authenticateToken, requestAdjustment);
router.get('/adjust/pending', authenticateToken, requirePermission('APPROVE_ATTENDANCE'), getPendingAdjustments);
router.post('/adjust/respond', authenticateToken, requirePermission('APPROVE_ATTENDANCE'), respondToAdjustment);
router.post('/override', authenticateToken, requirePermission('MANAGE_ATTENDANCE'), overrideAttendance);
router.get('/my-history', authenticateToken, getAttendance);
router.get('/all', authenticateToken, requirePermission('MANAGE_ATTENDANCE'), getAllAttendance);

export default router;
