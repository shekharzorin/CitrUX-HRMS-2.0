import { Router } from 'express';
import { getMyTimesheet, saveTimesheet, submitTimesheet, deleteEntry, getPendingTimesheets, approveTimesheet } from '../controllers/timesheet.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { saveTimesheetSchema, submitTimesheetSchema, approveTimesheetSchema } from '../validators/schemas';

const router = Router();

router.get('/my', authenticateToken, getMyTimesheet);
router.post('/save', authenticateToken, validate({ body: saveTimesheetSchema }), saveTimesheet);
router.post('/submit', authenticateToken, validate({ body: submitTimesheetSchema }), submitTimesheet);
router.delete('/entry/:id', authenticateToken, deleteEntry);
router.get('/pending', authenticateToken, requirePermission('APPROVE_TIMESHEETS'), getPendingTimesheets);
router.post('/approve', authenticateToken, requirePermission('APPROVE_TIMESHEETS'), validate({ body: approveTimesheetSchema }), approveTimesheet);

export default router;
