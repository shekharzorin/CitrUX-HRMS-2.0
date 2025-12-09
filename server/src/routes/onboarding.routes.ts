import { Router } from 'express';
import { submitOnboarding, getOnboardingStatus, approveOnboarding, getPendingOnboardings } from '../controllers/onboarding.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/submit', authenticateToken, submitOnboarding);
router.get('/status', authenticateToken, getOnboardingStatus);
router.get('/pending', authenticateToken, authorizeRole(['ADMIN', 'HR']), getPendingOnboardings);
router.put('/:id/approve', authenticateToken, authorizeRole(['ADMIN', 'HR']), approveOnboarding);

export default router;
