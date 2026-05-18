import { Router } from 'express';
import { createUser, getUsers, getUserById, updateUser, deleteUser, importUsers } from '../controllers/user.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', requirePermission('MANAGE_USERS'), createUser);
router.post('/import', requirePermission('MANAGE_USERS'), importUsers);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', requirePermission('MANAGE_USERS'), updateUser);
router.delete('/:id', requirePermission('MANAGE_USERS'), deleteUser);

export default router;
