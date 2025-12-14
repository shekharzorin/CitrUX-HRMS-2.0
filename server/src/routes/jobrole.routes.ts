import { Router } from 'express';
import { getJobRoles, createJobRole, deleteJobRole } from '../controllers/jobrole.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getJobRoles);
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'HR']), createJobRole);
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN', 'HR']), deleteJobRole);

export default router;
