import { Router } from 'express';
import { createGoal, getMyGoals, addReview, getMyReviews, getTeamReviews, updateGoal, deleteGoal } from '../controllers/performance.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/goals', createGoal);
router.get('/goals', getMyGoals);
router.put('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);

router.post('/reviews', authorizeRole(['ADMIN', 'HR', 'MANAGER']), addReview);
router.get('/reviews', getMyReviews);
router.get('/reviews/team', authorizeRole(['ADMIN', 'HR', 'MANAGER', 'SUPER_ADMIN']), getTeamReviews);

export default router;
