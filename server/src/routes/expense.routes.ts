import { Router } from 'express';
import { createCategory, getCategories, submitClaim, getMyClaims, getPendingClaims, updateClaimStatus } from '../controllers/expense.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createExpenseCategorySchema, submitClaimSchema, statusOnlySchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

// Categories
router.post('/categories', requirePermission('MANAGE_EXPENSE_CONFIG'), validate({ body: createExpenseCategorySchema }), createCategory);
router.get('/categories', getCategories);

// Claims
router.post('/claims', validate({ body: submitClaimSchema }), submitClaim);
router.get('/claims', getMyClaims);

// Approvals
router.get('/approvals', requirePermission('APPROVE_EXPENSES'), getPendingClaims);
router.put('/claims/:id/status', requirePermission('APPROVE_EXPENSES'), validate({ body: statusOnlySchema }), updateClaimStatus);

export default router;
