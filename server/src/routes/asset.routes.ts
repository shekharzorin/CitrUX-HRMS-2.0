import { Router } from 'express';
import { createAsset, getAllAssets, assignAsset, returnAsset, getMyAssets } from '../controllers/asset.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Admin Routes
router.post('/', authorizeRole(['ADMIN', 'IT']), createAsset);
router.get('/', authorizeRole(['ADMIN', 'IT']), getAllAssets);
router.put('/:id/assign', authorizeRole(['ADMIN', 'IT']), assignAsset);
router.put('/:id/return', authorizeRole(['ADMIN', 'IT']), returnAsset);

// Employee Routes
router.get('/my', getMyAssets);

export default router;
