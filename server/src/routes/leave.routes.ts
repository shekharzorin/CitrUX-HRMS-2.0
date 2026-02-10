import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
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
router.get('/team-requests', authorizeRole(['MANAGER', 'ADMIN', 'HR']), getTeamRequests); // For Managers
router.put('/:id/status', authorizeRole(['MANAGER', 'ADMIN', 'HR']), updateLeaveStatus); // Approve/Reject

// Admin Configuration
router.post('/types', authorizeRole(['ADMIN', 'HR']), createLeaveType);
router.delete('/types/:id', authorizeRole(['ADMIN', 'HR']), deleteLeaveType);
router.post('/year-end', authorizeRole(['ADMIN', 'HR']), processYearEnd);

// Encashment
router.post('/encash', encashLeave);
router.put('/encash/:id/status', authorizeRole(['ADMIN', 'HR']), updateEncashmentStatus);

export default router;
