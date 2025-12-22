import { Router } from 'express';
import {
    submitOnboarding,
    getOnboardingStatus,
    approveOnboarding,
    getPendingOnboardings,
    updateOnboarding
} from '../controllers/onboarding.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.post('/upload', authenticateToken, upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url });
});

// router.post('/submit', authenticateToken, submitOnboarding); // submit is final
router.put('/update', authenticateToken, updateOnboarding); // save as draft
router.post('/submit', authenticateToken, submitOnboarding);
router.get('/status', authenticateToken, getOnboardingStatus);
// router.put('/task/status', authenticateToken, updateTaskStatus); // Removed

router.get('/pending', authenticateToken, authorizeRole(['ADMIN', 'HR']), getPendingOnboardings);
router.put('/:id/approve', authenticateToken, authorizeRole(['ADMIN', 'HR']), approveOnboarding);

export default router;
