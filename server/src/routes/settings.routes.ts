import { Router } from 'express';
import { getSettings, updateSettings, getPublicSettings } from '../controllers/settings.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateSettingsSchema } from '../validators/schemas';

const router = Router();

router.get('/public', getPublicSettings);

router.get('/', authenticateToken, getSettings);
// Company admins can update their own tenant's settings; the controller still
// gates global systemSetting keys to SUPER_ADMIN by role check.
router.post('/', authenticateToken, requirePermission('MANAGE_COMPANY_SETTINGS'), validate({ body: updateSettingsSchema }), updateSettings);

export default router;
