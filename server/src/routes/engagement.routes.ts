import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
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
router.post('/recognitions', createRecognition);

router.get('/appraisals', getAppraisals);
router.post('/appraisals', createAppraisal);

export default router;
