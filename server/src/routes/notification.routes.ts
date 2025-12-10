import { Router } from 'express';
import { getNotifications, markRead, createNotification, getUnreadCount } from '../controllers/notification.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markRead);
router.post('/', createNotification); // Access control might be needed here usually

export default router;
