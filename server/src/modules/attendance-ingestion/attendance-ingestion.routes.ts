import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requirePermission } from '../../shared/auth';
import { validate } from '../../middlewares/validate.middleware';
import { manualSchema, gpsCheckinSchema } from './attendance-ingestion.validators';
import { recordManual, previewCsv, importCsv, getCheckinOptions, gpsCheckin, listEvents } from './attendance-ingestion.controller';

// Mounted at /api/attendance-ingestion behind authenticateToken + requireFeature('ATTENDANCE_FRAMEWORK').
const router = Router();

// Selfie image: in-memory (streamed to Cloudinary by UploadService), images only,
// single file, bounded size. Client already compresses to ~30-80KB.
const selfieUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) return cb(null, true);
        cb(new Error('Selfie must be an image'));
    },
});
const withSelfie = (req: Request, res: Response, next: NextFunction) =>
    selfieUpload.single('selfie')(req, res, (err: any) =>
        err ? res.status(400).json({ message: err.message || 'Selfie upload failed' }) : next());

// ── Employee self-service GPS check-in (no MANAGE_ATTENDANCE — you check yourself in) ──
router.get('/checkin/options', getCheckinOptions);
router.post('/checkin', withSelfie, validate({ body: gpsCheckinSchema }), gpsCheckin);
// Evidence/audit trail: own events always; another employee's requires MANAGE_ATTENDANCE (checked in service).
router.get('/events', listEvents);

// ── Admin/HR recording (manual + CSV) requires MANAGE_ATTENDANCE ──
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
