import { Router } from 'express';
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settings.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/public', getPublicSettings);

router.get('/', authenticateToken, getSettings);
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), updateSettings);

export default router;
