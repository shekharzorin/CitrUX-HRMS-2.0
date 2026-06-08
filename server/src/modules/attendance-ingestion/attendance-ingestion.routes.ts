import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requirePermission } from '../../shared/auth';
import { validate } from '../../middlewares/validate.middleware';
import { manualSchema } from './attendance-ingestion.validators';
import { recordManual, previewCsv, importCsv } from './attendance-ingestion.controller';

// Mounted at /api/attendance-ingestion behind authenticateToken + requireFeature('ATTENDANCE_FRAMEWORK').
// Recording attendance requires MANAGE_ATTENDANCE (ADMIN / HR).
const router = Router();
router.use(requirePermission('MANAGE_ATTENDANCE'));

const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ok = file.mimetype.includes('csv') || file.mimetype === 'text/plain'
            || file.mimetype === 'application/vnd.ms-excel' || file.originalname.toLowerCase().endsWith('.csv');
        if (ok) return cb(null, true);
        cb(new Error('Only CSV files are allowed'));
    },
});
const withCsv = (req: Request, res: Response, next: NextFunction) =>
    csvUpload.single('file')(req, res, (err: any) =>
        err ? res.status(400).json({ message: err.message || 'File upload failed' }) : next());

router.post('/manual', validate({ body: manualSchema }), recordManual);
router.post('/csv/preview', withCsv, previewCsv);
router.post('/csv/import', withCsv, importCsv);

export default router;
