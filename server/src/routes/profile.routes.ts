import { Router } from 'express';
import { getMyProfile, updateMyProfile, changePassword } from '../controllers/profile.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyProfile);
router.put('/', updateMyProfile);
router.put('/password', changePassword);

export default router;
