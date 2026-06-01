import { Router } from 'express';
import { resign, getOffboardingStatus, submitExitInterview, getResignations, updateOffboardingStatus, terminateEmployee } from '../controllers/offboarding.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { resignSchema, exitInterviewSchema, statusOnlySchema, terminateSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.post('/resign', validate({ body: resignSchema }), resign);
router.get('/status', getOffboardingStatus);
router.post('/exit-interview', validate({ body: exitInterviewSchema }), submitExitInterview);

router.get('/all', requirePermission('MANAGE_OFFBOARDING'), getResignations);
router.put('/:id/status', requirePermission('MANAGE_OFFBOARDING'), validate({ body: statusOnlySchema }), updateOffboardingStatus);
router.post('/terminate', requirePermission('MANAGE_OFFBOARDING'), validate({ body: terminateSchema }), terminateEmployee);

export default router;
