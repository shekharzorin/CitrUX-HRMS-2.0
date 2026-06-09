import { Router } from 'express';
import { handleImageUpload } from '../controllers/upload.controller';
import { uploadMemory } from '../middlewares/upload.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { uploadRateLimiter } from '../middlewares/rateLimit.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';
import { uploadToCloudinary } from '../utils/upload';
import multer from 'multer';
import os from 'os';

const router = Router();

// Generic file upload (PDFs/images): bounded size + MIME allowlist (was unbounded).
const diskUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, os.tmpdir()),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') return cb(null, true);
        cb(new Error('Only images and PDF files are allowed'));
    },
});

const handleUploadErr = (mw: any) => (req: any, res: any, next: any) =>
    mw(req, res, (err: any) => err ? res.status(400).json({ message: err.message || 'Upload failed' }) : next());

/**
 * Endpoint for processed images (avatars, logos, etc.)
 * Uses Sharp for optimization and multi-size generation.
 */
router.post('/image', authenticateToken, uploadRateLimiter, handleUploadErr(uploadMemory.single('file')), handleImageUpload);

/**
 * Generic File Upload (e.g. PDFs, documents) — rate-limited, MIME/size-bounded,
 * stored in a per-tenant Cloudinary subfolder.
 */
router.post('/', authenticateToken, uploadRateLimiter, handleUploadErr(diskUpload.single('file')), async (req: AuthRequest, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = req.file.path;
        const secureUrl = await uploadToCloudinary(filePath, true, req.user?.companyId ?? undefined);

        return res.status(200).json({ 
            message: "File uploaded successfully",
            url: secureUrl 
        });
    } catch (error: any) {
        console.error("Upload API Error:", error);
        return res.status(500).json({ message: error.message || "Failed to process upload" });
    }
});

export default router;
