import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { bulkImportEmployees } from '../controllers/import.controller';

const router = Router();

router.use(authenticateToken);

// Bulk Import (Admin/HR restricted - usually handled by authenticateToken + Role check, 
// but here we just need to ensure token is valid as a start)
router.post('/employees', bulkImportEmployees);

export default router;
