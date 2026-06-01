import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createHolidaySchema } from '../validators/schemas';
import { getHolidays, createHoliday, deleteHoliday } from '../controllers/holiday.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getHolidays);
router.post('/', requirePermission('MANAGE_HOLIDAYS'), validate({ body: createHolidaySchema }), createHoliday);
router.delete('/:id', requirePermission('MANAGE_HOLIDAYS'), deleteHoliday);

export default router;
