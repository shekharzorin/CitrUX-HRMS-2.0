import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { getMyTasks, getTeamTasks, createTask, updateTask, deleteTask } from '../controllers/task.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyTasks);
router.get('/team', requirePermission('ASSIGN_TASKS'), getTeamTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', requirePermission('ASSIGN_TASKS'), deleteTask);

export default router;
