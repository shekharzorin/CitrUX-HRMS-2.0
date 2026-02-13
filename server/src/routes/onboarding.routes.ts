import { Router } from 'express';
import {
    submitOnboarding,
    getOnboardingStatus,
    approveOnboarding,
    getPendingOnboardings,
    updateOnboarding,
    rejectOnboarding
} from '../controllers/onboarding.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

import { upload } from '../middlewares/upload.middleware';

const router = Router();
console.log('[Onboarding Routes] Initializing...');


const uploadMiddleware = (req: any, res: any, next: any) => {
    upload.single('file')(req, res, (err: any) => {
        if (err) {
            console.error('[Upload Middleware] Error:', err);
            return res.status(400).json({ message: err.message || 'File upload failed' });
        }
        next();
    });
};

router.post('/upload', authenticateToken, uploadMiddleware, (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    // Multer provides absolute path in req.file.path
    // We need to return the URL relative to the server
    const filename = req.file.filename;
    let url = '';

    // Check if Cloudinary storage (path is already a URL)
    if (req.file.path && req.file.path.startsWith('http')) {
        url = req.file.path;
    } else {
        // Local storage fallback
        url = `${process.env.API_URL || 'http://localhost:5001'}/uploads/${filename}`;
    }

    console.log('[Upload Endpoint] Success, URL:', url);
    res.json({ url });
});

// router.post('/submit', authenticateToken, submitOnboarding); // submit is final
router.put('/update', authenticateToken, updateOnboarding); // save as draft
router.post('/submit', authenticateToken, submitOnboarding);
router.get('/status', authenticateToken, getOnboardingStatus);
// router.put('/task/status', authenticateToken, updateTaskStatus); // Removed

router.get('/pending', authenticateToken, authorizeRole(['ADMIN', 'HR']), getPendingOnboardings);
router.put('/:id/approve', authenticateToken, authorizeRole(['ADMIN', 'HR']), approveOnboarding);
router.put('/:id/reject', authenticateToken, authorizeRole(['ADMIN', 'HR']), rejectOnboarding);

export default router;
