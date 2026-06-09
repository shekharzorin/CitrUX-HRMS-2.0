import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { bulkImportEmployees } from '../controllers/import.controller';

const router = Router();

router.use(authenticateToken);

// Bulk Import — creating employee accounts requires MANAGE_USERS; the controller
// always scopes new users to the caller's company.
router.post('/employees', requirePermission('MANAGE_USERS'), bulkImportEmployees);

export default router;
