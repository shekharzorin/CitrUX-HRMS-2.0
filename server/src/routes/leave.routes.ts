import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    getLeaveTypes,
    getMyBalances,
    applyLeave,
    getMyRequests,
    deleteLeaveRequest,
    getTeamRequests,
    updateLeaveStatus,
    createLeaveType,
    deleteLeaveType
} from '../controllers/leave.controller';

const router = Router();

router.use(authenticateToken);

router.get('/types', getLeaveTypes);
router.get('/balances', getMyBalances);
router.post('/apply', applyLeave);
router.get('/my-requests', getMyRequests);
router.delete('/requests/:id', deleteLeaveRequest);
router.get('/team-requests', getTeamRequests); // For Managers
router.put('/:id/status', updateLeaveStatus); // Approve/Reject

// Admin Configuration
router.post('/types', createLeaveType);
router.delete('/types/:id', deleteLeaveType);

export default router;
