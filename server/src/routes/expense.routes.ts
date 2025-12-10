import { Router } from 'express';
import { createCategory, getCategories, submitClaim, getMyClaims, getPendingClaims, updateClaimStatus } from '../controllers/expense.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Categories
router.post('/categories', authorizeRole(['ADMIN', 'HR']), createCategory);
router.get('/categories', getCategories);

// Claims
router.post('/claims', submitClaim);
router.get('/claims', getMyClaims);

// Approvals
router.get('/approvals', authorizeRole(['ADMIN', 'HR', 'MANAGER']), getPendingClaims);
router.put('/claims/:id/status', authorizeRole(['ADMIN', 'HR', 'MANAGER']), updateClaimStatus);

export default router;
