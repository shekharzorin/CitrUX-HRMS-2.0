import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, globalSearch);

export default router;
