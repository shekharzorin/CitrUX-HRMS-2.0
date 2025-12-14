import { Router } from 'express';
import { createUser, getUsers, getUserById, updateUser, deleteUser, importUsers } from '../controllers/user.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), createUser);
router.post('/import', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), importUsers);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), updateUser);
router.delete('/:id', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), deleteUser);

export default router;
