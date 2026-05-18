import { Router } from 'express';
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settings.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.get('/public', getPublicSettings);

router.get('/', authenticateToken, getSettings);
router.post('/', authenticateToken, requirePermission('MANAGE_SETTINGS'), updateSettings);

export default router;
