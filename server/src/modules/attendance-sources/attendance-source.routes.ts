import { Router } from 'express';
import { requirePermission } from '../../shared/auth';
import { validate } from '../../middlewares/validate.middleware';
import { createSourceSchema, updateSourceSchema } from './attendance-source.validators';
import {
    getCapabilities, listSources, createSource, updateSource, deleteSource,
} from './attendance-source.controller';

// Mounted at /api/attendance-sources behind authenticateToken + requireFeature('ATTENDANCE_FRAMEWORK').
// ADMIN owns all attendance settings → every route requires MANAGE_ATTENDANCE_SOURCES.
const router = Router();

router.use(requirePermission('MANAGE_ATTENDANCE_SOURCES'));

router.get('/capabilities', getCapabilities);
router.get('/', listSources);
router.post('/', validate({ body: createSourceSchema }), createSource);
router.put('/:id', validate({ body: updateSourceSchema }), updateSource);
router.delete('/:id', deleteSource);

export default router;
