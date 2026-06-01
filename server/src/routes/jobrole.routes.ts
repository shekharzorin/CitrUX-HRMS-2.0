import { Router } from 'express';
import { getJobRoles, createJobRole, deleteJobRole } from '../controllers/jobrole.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createJobRoleSchema } from '../validators/schemas';

const router = Router();

router.get('/', authenticateToken, getJobRoles);
router.post('/', authenticateToken, requirePermission('MANAGE_JOB_ROLES'), validate({ body: createJobRoleSchema }), createJobRole);
router.delete('/:id', authenticateToken, requirePermission('MANAGE_JOB_ROLES'), deleteJobRole);

export default router;
