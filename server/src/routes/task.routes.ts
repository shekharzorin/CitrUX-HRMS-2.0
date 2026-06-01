import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createTaskSchema } from '../validators/schemas';
import { getMyTasks, getTeamTasks, createTask, updateTask, deleteTask } from '../controllers/task.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyTasks);
router.get('/team', requirePermission('ASSIGN_TASKS'), getTeamTasks);
router.post('/', validate({ body: createTaskSchema }), createTask);
router.put('/:id', updateTask);
router.delete('/:id', requirePermission('ASSIGN_TASKS'), deleteTask);

export default router;
