import { Router } from 'express';
import { createUser, getUsers, getUserById, updateUser, deleteUser, importUsers, restoreUser } from '../controllers/user.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

router.post('/', requirePermission('MANAGE_USERS'), validate({ body: createUserSchema }), createUser);
router.post('/import', requirePermission('MANAGE_USERS'), importUsers);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', requirePermission('MANAGE_USERS'), updateUser);
router.put('/:id/restore', requirePermission('MANAGE_USERS'), restoreUser);
router.delete('/:id', requirePermission('MANAGE_USERS'), deleteUser);

export default router;
