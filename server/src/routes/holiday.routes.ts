import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import { getHolidays, createHoliday, deleteHoliday } from '../controllers/holiday.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getHolidays);
router.post('/', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), createHoliday);
router.delete('/:id', authorizeRole(['ADMIN', 'HR', 'SUPER_ADMIN']), deleteHoliday);

export default router;
