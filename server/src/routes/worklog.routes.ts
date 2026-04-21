import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getMyWorkLogs, createWorkLog, updateWorkLog, deleteWorkLog } from '../controllers/worklog.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyWorkLogs);
router.post('/', createWorkLog);
router.put('/:id', updateWorkLog);
router.delete('/:id', deleteWorkLog);

export default router;
