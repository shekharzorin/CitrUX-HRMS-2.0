
import { Router } from 'express';
import { getSystemStatus, getSystemErrors } from '../controllers/health.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// Stats - Admin Only
router.get('/status', authenticateToken, requirePermission('VIEW_SYSTEM_HEALTH'), getSystemStatus);
router.get('/errors', authenticateToken, requirePermission('VIEW_SYSTEM_HEALTH'), getSystemErrors);

export default router;
