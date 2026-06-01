import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { cacheMiddleware } from '../middlewares/cache.middleware';
import { validate } from '../middlewares/validate.middleware';
import { shiftSchema, assignShiftSchema, bulkAssignShiftSchema } from '../validators/schemas';
import {
    createShift,
    getShifts,
    getShift,
    updateShift,
    deleteShift,
    assignShift,
    bulkAssignShift,
    getShiftUsers,
} from '../controllers/shift.controller';

const router = Router();

router.use(authenticateToken);

const adminOrHR = requirePermission('MANAGE_SHIFTS');

router.get('/',                    cacheMiddleware('shifts', parseInt(process.env.CACHE_TTL_SHIFTS || '300000')), getShifts);
router.post('/',                   adminOrHR, validate({ body: shiftSchema }), createShift);
router.get('/:id',                 cacheMiddleware('shifts', parseInt(process.env.CACHE_TTL_SHIFTS || '300000')), getShift);
router.put('/:id',                 adminOrHR, validate({ body: shiftSchema }), updateShift);
router.delete('/:id',              adminOrHR, deleteShift);
router.get('/:id/users',           adminOrHR, getShiftUsers);
router.post('/assign',             adminOrHR, validate({ body: assignShiftSchema }), assignShift);
router.post('/assign/bulk',        adminOrHR, validate({ body: bulkAssignShiftSchema }), bulkAssignShift);

export default router;
