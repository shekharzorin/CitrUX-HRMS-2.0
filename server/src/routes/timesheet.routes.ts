import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getMyTimesheet, saveTimesheet, submitTimesheet, deleteEntry } from '../controllers/timesheet.controller';

const router = Router();

router.use(authenticateToken);

router.get('/my', getMyTimesheet);
router.post('/save', saveTimesheet);
router.post('/submit', submitTimesheet);
router.delete('/entry/:id', deleteEntry);

export default router;
