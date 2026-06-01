import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, authorizeRole, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { uploadDocumentSchema, verifyDocumentSchema } from '../validators/schemas';
import {
    uploadDocument,
    getMyDocuments,
    getUserDocuments,
    getAllCompanyDocuments,
    verifyDocument,
    getExpiringDocuments,
    generateSecureUrl,
    updateDocument,
    deleteDocument
} from '../controllers/document.controller';

const router = Router();

// Multer Setup (Memory Storage for centralized upload service)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(authenticateToken);

router.get('/generate-url/*filename', generateSecureUrl);
router.post('/upload', upload.single('file'), validate({ body: uploadDocumentSchema }), uploadDocument);
router.get('/my', getMyDocuments);

// User & Admin shared (access controlled in controller)
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// Admin Routes
router.get('/company/all', requirePermission('MANAGE_DOCUMENTS'), getAllCompanyDocuments);
router.get('/user/:userId', requirePermission('VIEW_USER_DOCUMENTS'), getUserDocuments);
router.put('/:id/verify', requirePermission('MANAGE_DOCUMENTS'), validate({ body: verifyDocumentSchema }), verifyDocument);
router.get('/expiring', requirePermission('MANAGE_DOCUMENTS'), getExpiringDocuments);

export default router;
