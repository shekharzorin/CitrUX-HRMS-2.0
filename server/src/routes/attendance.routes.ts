import { Router } from 'express';
import { punchIn, punchOut, getAttendance, getAllAttendance, startBreak, endBreak, requestAdjustment, getPendingAdjustments, respondToAdjustment, overrideAttendance } from '../controllers/attendance.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/punch-in', authenticateToken, punchIn);
router.post('/punch-out', authenticateToken, punchOut);
router.post('/break/start', authenticateToken, startBreak);
router.post('/break/end', authenticateToken, endBreak);
router.post('/adjust', authenticateToken, requestAdjustment);
router.get('/adjust/pending', authenticateToken, getPendingAdjustments);
router.post('/adjust/respond', authenticateToken, respondToAdjustment);
router.post('/override', authenticateToken, authorizeRole(['ADMIN', 'HR']), overrideAttendance);
router.get('/my-history', authenticateToken, getAttendance);
router.get('/all', authenticateToken, authorizeRole(['ADMIN', 'HR']), getAllAttendance);

export default router;
