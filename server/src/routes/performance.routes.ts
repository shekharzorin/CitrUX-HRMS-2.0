import { Router } from 'express';
import { createGoal, getMyGoals, addReview, getMyReviews } from '../controllers/performance.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/goals', createGoal);
router.get('/goals', getMyGoals);

router.post('/reviews', authorizeRole(['ADMIN', 'HR', 'MANAGER']), addReview);
router.get('/reviews', getMyReviews);

export default router;
