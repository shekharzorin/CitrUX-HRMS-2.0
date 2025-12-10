import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { createShift, getShifts, assignShift } from '../controllers/shift.controller';

const router = Router();

router.use(authenticateToken);

// Only Admins/HR can manage shifts
router.post('/', authorizeRole(['ADMIN', 'HR']), createShift);
router.get('/', getShifts); // Employees can view? Maybe.
router.post('/assign', authorizeRole(['ADMIN', 'HR']), assignShift);

export default router;
