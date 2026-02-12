
import { Router } from 'express';
import { getSystemStatus, getSystemErrors } from '../controllers/health.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// Stats - Admin Only
router.get('/status', authenticateToken, authorizeRole(['ADMIN', 'SUPER_ADMIN']), getSystemStatus);
router.get('/errors', authenticateToken, authorizeRole(['ADMIN', 'SUPER_ADMIN']), getSystemErrors);

export default router;
