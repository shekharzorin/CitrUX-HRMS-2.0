import { Router } from 'express';
import { resign, getOffboardingStatus, submitExitInterview, getResignations, updateOffboardingStatus } from '../controllers/offboarding.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/resign', resign);
router.get('/status', getOffboardingStatus);
router.post('/exit-interview', submitExitInterview);

router.get('/all', authorizeRole(['ADMIN', 'HR']), getResignations);
router.put('/:id/status', authorizeRole(['ADMIN', 'HR']), updateOffboardingStatus);

export default router;
