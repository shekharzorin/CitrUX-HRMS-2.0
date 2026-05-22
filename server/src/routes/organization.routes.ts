import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { getBranches, getDepartments, createBranch, createDepartment, deleteBranch, deleteDepartment } from '../controllers/organization.controller';

const router = Router();

router.use(authenticateToken);

router.get('/branches', getBranches);
router.get('/departments', getDepartments);

router.post('/branches', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), createBranch);
router.post('/departments', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), createDepartment);

router.delete('/branches/:id', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), deleteBranch);
router.delete('/departments/:id', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), deleteDepartment);

export default router;
