import { Router } from 'express';
import { getNotifications, markRead, markAllRead, createNotification, getUnreadCount, broadcastNotification } from '../controllers/notification.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createNotificationSchema, broadcastNotificationSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.post('/broadcast', requirePermission('MANAGE_USERS'), validate({ body: broadcastNotificationSchema }), broadcastNotification);
router.post('/', validate({ body: createNotificationSchema }), createNotification); // Access control might be needed here usually

export default router;
