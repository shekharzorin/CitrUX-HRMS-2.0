import { Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';

// Create Job Posting (Admin)
export const createJob = async (req: AuthRequest, res: Response) => {
    try {
        const { title, department, description } = req.body;
        const scope = getTenantScope(req);

        if (!scope.companyId && req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Company ID required' });
        }

        // @ts-ignore
        const job = await prisma.jobPosting.create({
            data: { 
                title, 
                department, 
                description,
                companyId: scope.companyId
            }
        });
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Error creating job' });
    }
};

// Get All Jobs (Public/Internal)
export const getJobs = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        // @ts-ignore
        const jobs = await prisma.jobPosting.findMany({
            where: { 
                ...scope,
                status: 'OPEN' 
            }
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching jobs' });
    }
};

// Apply for Job (Public)
export const applyForJob = async (req: AuthRequest, res: Response) => {
    try {
        const { jobId, applicantName, email, phone, resumeUrl } = req.body;
        
        // Ensure the job exists and get its companyId if we want to track it
        // @ts-ignore
        const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        // @ts-ignore
        const application = await prisma.jobApplication.create({
            data: { jobId, applicantName, email, phone, resumeUrl }
        });
        res.json(application);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting application' });
    }
};

// Get Applications (Admin)
export const getApplications = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        
        // @ts-ignore
        const apps = await prisma.jobApplication.findMany({
            where: {
                job: {
                    ...scope
                }
            },
            include: { job: true }
        });
        res.json(apps);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

// Update Application Status (Admin)
export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status } = req.body;
        
        // Check ownership via job
        // @ts-ignore
        const app = await prisma.jobApplication.findUnique({
            where: { id },
            include: { job: true }
        });

        if (!app) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (!assertSameCompany(app.job.companyId, req, res)) return;

        // @ts-ignore
        const updated = await prisma.jobApplication.update({
            where: { id },
            data: { status }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
    }
};
