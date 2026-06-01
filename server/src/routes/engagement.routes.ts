import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { recognitionSchema, reviewSchema } from '../validators/schemas';
import {
    getUpcomingEvents,
    getRecognitions,
    createRecognition,
    getAppraisals,
    createAppraisal
} from '../controllers/engagement.controller';

const router = Router();

router.use(authenticateToken);

router.get('/events', getUpcomingEvents);
router.get('/recognitions', getRecognitions);
router.post('/recognitions', validate({ body: recognitionSchema }), createRecognition);

router.get('/appraisals', getAppraisals);
router.post('/appraisals', validate({ body: reviewSchema }), createAppraisal);

export default router;
