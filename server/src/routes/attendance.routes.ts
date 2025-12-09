import { Router } from 'express';
import { punchIn, punchOut, getAttendance, getAllAttendance } from '../controllers/attendance.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/punch-in', authenticateToken, punchIn);
router.post('/punch-out', authenticateToken, punchOut);
router.get('/my-history', authenticateToken, getAttendance);
router.get('/all', authenticateToken, authorizeRole(['ADMIN', 'HR']), getAllAttendance);

export default router;
