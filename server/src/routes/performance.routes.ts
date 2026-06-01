import { Router } from 'express';
import { createGoal, getMyGoals, addReview, getMyReviews, getTeamReviews, updateGoal, deleteGoal } from '../controllers/performance.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createGoalSchema, reviewSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.post('/goals', validate({ body: createGoalSchema }), createGoal);
router.get('/goals', getMyGoals);
router.put('/goals/:id', updateGoal);
router.delete('/goals/:id', deleteGoal);

router.post('/reviews', requirePermission('SUBMIT_APPRAISAL'), validate({ body: reviewSchema }), addReview);
router.get('/reviews', getMyReviews);
router.get('/reviews/team', requirePermission('VIEW_ALL_APPRAISALS'), getTeamReviews);

export default router;
