import { Router } from 'express';
import { createAsset, getAllAssets, assignAsset, returnAsset, getMyAssets } from '../controllers/asset.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createAssetSchema, assignAssetSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken);

// Admin Routes
router.post('/', requirePermission('MANAGE_ASSETS'), validate({ body: createAssetSchema }), createAsset);
router.get('/', requirePermission('MANAGE_ASSETS'), getAllAssets);
router.put('/:id/assign', requirePermission('MANAGE_ASSETS'), validate({ body: assignAssetSchema }), assignAsset);
router.put('/:id/return', requirePermission('MANAGE_ASSETS'), returnAsset);

// Employee Routes
router.get('/my', getMyAssets);

export default router;
