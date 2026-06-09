import { Router } from 'express';
import { punchIn, punchOut, getAttendance, getAllAttendance, startBreak, endBreak, requestAdjustment, getPendingAdjustments, respondToAdjustment, overrideAttendance, getAdminRecords, getAdminFilterOptions, exportAdminRecords } from '../controllers/attendance.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { requestAdjustmentSchema, respondAdjustmentSchema, overrideAttendanceSchema } from '../validators/schemas';

const router = Router();

router.post('/punch-in', authenticateToken, punchIn);
router.post('/punch-out', authenticateToken, punchOut);
router.post('/break/start', authenticateToken, startBreak);
router.post('/break/end', authenticateToken, endBreak);
router.post('/adjust', authenticateToken, validate({ body: requestAdjustmentSchema }), requestAdjustment);
router.get('/adjust/pending', authenticateToken, requirePermission('APPROVE_ATTENDANCE'), getPendingAdjustments);
router.post('/adjust/respond', authenticateToken, requirePermission('APPROVE_ATTENDANCE'), validate({ body: respondAdjustmentSchema }), respondToAdjustment);
router.post('/override', authenticateToken, requirePermission('MANAGE_ATTENDANCE'), validate({ body: overrideAttendanceSchema }), overrideAttendance);
router.get('/my-history', authenticateToken, getAttendance);
router.get('/all', authenticateToken, requirePermission('MANAGE_ATTENDANCE'), getAllAttendance);

// Admin/HR org-wide attendance console (paginated + filtered + CSV export).
router.get('/admin/filter-options', authenticateToken, requirePermission('MANAGE_ATTENDANCE'), getAdminFilterOptions);
router.get('/admin/records', authenticateToken, requirePermission('MANAGE_ATTENDANCE'), getAdminRecords);
router.get('/admin/records/export', authenticateToken, requirePermission('MANAGE_ATTENDANCE'), exportAdminRecords);

export default router;
