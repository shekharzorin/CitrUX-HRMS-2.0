import { Router } from 'express';
import { requirePermission } from '../../shared/auth';
import { validate } from '../../middlewares/validate.middleware';
import { createQueueSchema, updateQueueSchema } from './support-department.validators';
import {
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    restoreDepartment,
} from './support-department.controller';

// Mounted at /api/support behind authenticateToken + requireFeature('SUPPORT_DESK').
const router = Router();

// Listing is visibility-filtered in the service (employee tile picker + agent queue).
router.get('/departments', listDepartments);

// Queue administration.
router.post('/departments', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), validate({ body: createQueueSchema }), createDepartment);
router.put('/departments/:id', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), validate({ body: updateQueueSchema }), updateDepartment);
router.delete('/departments/:id', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), deleteDepartment);
router.post('/departments/:id/restore', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), restoreDepartment);

export default router;
