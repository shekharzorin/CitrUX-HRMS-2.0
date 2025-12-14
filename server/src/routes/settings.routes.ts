import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', authenticateToken, getSettings);
router.post('/', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), updateSettings);

export default router;
