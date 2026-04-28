import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
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

const adminOrHR = authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']);

router.get('/',                    getShifts);
router.post('/',                   adminOrHR, createShift);
router.get('/:id',                 getShift);
router.put('/:id',                 adminOrHR, updateShift);
router.delete('/:id',              adminOrHR, deleteShift);
router.get('/:id/users',           adminOrHR, getShiftUsers);
router.post('/assign',             adminOrHR, assignShift);
router.post('/assign/bulk',        adminOrHR, bulkAssignShift);

export default router;
