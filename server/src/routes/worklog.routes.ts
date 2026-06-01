import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createWorkLogSchema } from '../validators/schemas';
import { getMyWorkLogs, createWorkLog, updateWorkLog, deleteWorkLog } from '../controllers/worklog.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyWorkLogs);
router.post('/', validate({ body: createWorkLogSchema }), createWorkLog);
router.put('/:id', updateWorkLog);
router.delete('/:id', deleteWorkLog);

export default router;
