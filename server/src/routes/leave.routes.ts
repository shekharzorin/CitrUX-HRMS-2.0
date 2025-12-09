import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    getLeaveTypes,
    getMyBalances,
    applyLeave,
    getMyRequests,
    getTeamRequests,
    updateLeaveStatus
} from '../controllers/leave.controller';

const router = Router();

router.use(authenticateToken);

router.get('/types', getLeaveTypes);
router.get('/balances', getMyBalances);
router.post('/apply', applyLeave);
router.get('/my-requests', getMyRequests);
router.get('/team-requests', getTeamRequests); // For Managers
router.put('/:id/status', updateLeaveStatus); // Approve/Reject

export default router;
