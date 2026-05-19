import { Router } from 'express';
import { createJob, getJobs, applyForJob, getApplications, updateApplicationStatus } from '../controllers/recruitment.controller';
import { authenticateToken, authorizeRole, optionalAuthenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Public Routes
router.get('/jobs', optionalAuthenticateToken, getJobs);
router.post('/apply', applyForJob);

// Admin Routes
router.post('/jobs', authenticateToken, authorizeRole(['ADMIN', 'HR']), createJob);
router.get('/applications', authenticateToken, authorizeRole(['ADMIN', 'HR']), getApplications);
router.put('/applications/:id/status', authenticateToken, authorizeRole(['ADMIN', 'HR']), updateApplicationStatus);

export default router;
