import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
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

router.get('/types', getLeaveTypes);
router.get('/balances', getMyBalances);
router.post('/apply', applyLeave);
router.get('/my-requests', getMyRequests);
router.delete('/requests/:id', deleteLeaveRequest);
router.get('/team-requests', requirePermission('APPROVE_LEAVES'), getTeamRequests); // For Managers
router.put('/:id/status', requirePermission('APPROVE_LEAVES'), updateLeaveStatus); // Approve/Reject

// Admin Configuration
router.post('/types', requirePermission('MANAGE_SETTINGS'), createLeaveType);
router.delete('/types/:id', requirePermission('MANAGE_SETTINGS'), deleteLeaveType);
router.post('/year-end', requirePermission('MANAGE_SETTINGS'), processYearEnd);

// Encashment
router.post('/encash', encashLeave);
router.put('/encash/:id/status', requirePermission('MANAGE_PAYROLL'), updateEncashmentStatus);

export default router;
