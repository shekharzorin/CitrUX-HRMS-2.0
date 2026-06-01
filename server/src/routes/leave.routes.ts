import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import { validate } from '../middlewares/validate.middleware';
import { applyLeaveSchema, leaveStatusSchema, createLeaveTypeSchema, encashLeaveSchema, encashmentStatusSchema } from '../validators/schemas';
import {
    getLeaveTypes,
    getMyBalances,
    applyLeave,
    getMyRequests,
    deleteLeaveRequest,
    getTeamRequests,
    updateLeaveStatus,
    createLeaveType,
    deleteLeaveType,
    processYearEnd,
    encashLeave,
    updateEncashmentStatus
} from '../controllers/leave.controller';

const router = Router();

router.use(authenticateToken);

router.get('/types', cacheMiddleware('leaveTypes', parseInt(process.env.CACHE_TTL_LEAVE_TYPES || '1800000')), getLeaveTypes);
router.get('/balances', getMyBalances);
router.post('/apply', validate({ body: applyLeaveSchema }), applyLeave);
router.get('/my-requests', getMyRequests);
router.delete('/requests/:id', deleteLeaveRequest);
router.get('/team-requests', requirePermission('APPROVE_LEAVES'), getTeamRequests); // For Managers
router.put('/:id/status', requirePermission('APPROVE_LEAVES'), validate({ body: leaveStatusSchema }), updateLeaveStatus); // Approve/Reject

// Admin Configuration
router.post('/types', requirePermission('MANAGE_COMPANY_SETTINGS'), validate({ body: createLeaveTypeSchema }), createLeaveType);
router.delete('/types/:id', requirePermission('MANAGE_COMPANY_SETTINGS'), deleteLeaveType);
router.post('/year-end', requirePermission('MANAGE_COMPANY_SETTINGS'), processYearEnd);

// Encashment
router.post('/encash', validate({ body: encashLeaveSchema }), encashLeave);
router.put('/encash/:id/status', requirePermission('MANAGE_PAYROLL'), validate({ body: encashmentStatusSchema }), updateEncashmentStatus);

export default router;
