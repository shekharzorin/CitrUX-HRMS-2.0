import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';
import {
    uploadDocument,
    getMyDocuments,
    getUserDocuments,
    verifyDocument,
    getExpiringDocuments,
    generateSecureUrl
} from '../controllers/document.controller';

const router = Router();

// Multer Setup (Reusable logic, usually extracted but inline here for speed)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`);
    }
});
const upload = multer({ storage });

router.use(authenticateToken);

router.get('/generate-url/:filename', generateSecureUrl);
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/my', getMyDocuments);

// Admin Routes
router.get('/user/:userId', authorizeRole(['ADMIN', 'HR', 'MANAGER']), getUserDocuments);
router.put('/:id/verify', authorizeRole(['ADMIN', 'HR']), verifyDocument);
router.get('/expiring', authorizeRole(['ADMIN', 'HR']), getExpiringDocuments);

export default router;
