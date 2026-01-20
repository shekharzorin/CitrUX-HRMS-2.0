import { Router } from 'express';
import { getDashboardStats } from '../controllers/stats.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Admin Only
router.get('/', getDashboardStats);

export default router;
