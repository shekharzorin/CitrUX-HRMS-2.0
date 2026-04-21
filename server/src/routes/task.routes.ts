import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getMyTasks, createTask, updateTask, deleteTask } from '../controllers/task.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
