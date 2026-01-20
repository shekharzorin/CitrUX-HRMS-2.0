import { Router } from 'express';
import { createGoal, getMyGoals, addReview, getMyReviews } from '../controllers/performance.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/goals', createGoal);
router.get('/goals', getMyGoals);
router.put('/goals/:id', authenticateToken, (req, res, next) => {
    // @ts-ignore
    import('../controllers/performance.controller').then(c => c.updateGoal(req, res)).catch(next);
});
router.delete('/goals/:id', authenticateToken, (req, res, next) => {
    // @ts-ignore
    import('../controllers/performance.controller').then(c => c.deleteGoal(req, res)).catch(next);
});

router.post('/reviews', authorizeRole(['ADMIN', 'HR', 'MANAGER']), addReview);
router.get('/reviews', getMyReviews);

export default router;
