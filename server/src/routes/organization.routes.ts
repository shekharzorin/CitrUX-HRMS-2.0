import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createBranchSchema, createDepartmentSchema } from '../validators/schemas';
import { getBranches, getDepartments, createBranch, createDepartment, deleteBranch, deleteDepartment } from '../controllers/organization.controller';

const router = Router();

router.use(authenticateToken);

router.get('/branches', getBranches);
router.get('/departments', cacheMiddleware('departments', parseInt(process.env.CACHE_TTL_DEPARTMENTS || '900000')), getDepartments);

router.post('/branches', requirePermission('MANAGE_ORG_STRUCTURE'), validate({ body: createBranchSchema }), createBranch);
router.post('/departments', requirePermission('MANAGE_ORG_STRUCTURE'), validate({ body: createDepartmentSchema }), createDepartment);

router.delete('/branches/:id', requirePermission('MANAGE_ORG_STRUCTURE'), deleteBranch);
router.delete('/departments/:id', requirePermission('MANAGE_ORG_STRUCTURE'), deleteDepartment);

export default router;
