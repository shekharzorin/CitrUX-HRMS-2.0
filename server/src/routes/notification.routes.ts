import { Router } from 'express';
import { getMyNotifications, markAsRead } from '../controllers/notification.controller';
import { getAdminStats } from '../controllers/stats.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getMyNotifications);
router.put('/:id/read', authenticateToken, markAsRead);
router.get('/admin-stats', authenticateToken, authorizeRole(['ADMIN', 'HR']), getAdminStats);

export default router;
