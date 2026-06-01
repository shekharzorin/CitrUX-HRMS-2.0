import { Router } from 'express';
import { createJob, getJobs, applyForJob, getApplications, updateApplicationStatus } from '../controllers/recruitment.controller';
import { authenticateToken, requirePermission, optionalAuthenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createJobSchema, applyForJobSchema, statusOnlySchema } from '../validators/schemas';

const router = Router();

// Public Routes
router.get('/jobs', optionalAuthenticateToken, getJobs);
router.post('/apply', validate({ body: applyForJobSchema }), applyForJob);

// Admin Routes
router.post('/jobs', authenticateToken, requirePermission('MANAGE_RECRUITMENT'), validate({ body: createJobSchema }), createJob);
router.get('/applications', authenticateToken, requirePermission('MANAGE_RECRUITMENT'), getApplications);
router.put('/applications/:id/status', authenticateToken, requirePermission('MANAGE_RECRUITMENT'), validate({ body: statusOnlySchema }), updateApplicationStatus);

export default router;
