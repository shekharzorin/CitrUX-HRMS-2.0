import { Router } from 'express';
import { getMyTimesheet, saveTimesheet, submitTimesheet, deleteEntry, getPendingTimesheets, approveTimesheet } from '../controllers/timesheet.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my', authenticateToken, getMyTimesheet);
router.post('/save', authenticateToken, saveTimesheet);
router.post('/submit', authenticateToken, submitTimesheet);
router.delete('/entry/:id', authenticateToken, deleteEntry);
router.get('/pending', authenticateToken, authorizeRole(['ADMIN', 'HR']), getPendingTimesheets);
router.post('/approve', authenticateToken, authorizeRole(['ADMIN', 'HR']), approveTimesheet);

export default router;
