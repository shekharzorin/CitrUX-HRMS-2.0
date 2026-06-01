import { Router } from 'express';
import { getMyProfile, updateMyProfile, changePassword } from '../controllers/profile.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { changePasswordSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyProfile);
router.put('/', updateMyProfile);
router.put('/password', validate({ body: changePasswordSchema }), changePassword);

export default router;
