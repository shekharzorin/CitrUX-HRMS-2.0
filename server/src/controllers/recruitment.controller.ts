import { Request, Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';

// Create Job Posting (Admin)
export const createJob = async (req: Request, res: Response) => {
    try {
        const { title, department, description } = req.body;
        // @ts-ignore
        const job = await prisma.jobPosting.create({
            data: { title, department, description }
        });
        res.json(job);
    } catch (error) {
        res.status(500).json({ message: 'Error creating job' });
    }
};

// Get All Jobs (Public/Internal)
export const getJobs = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const jobs = await prisma.jobPosting.findMany({
            where: { status: 'OPEN' }
        });
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching jobs' });
    }
};

// Apply for Job (Public)
export const applyForJob = async (req: Request, res: Response) => {
    try {
        const { jobId, applicantName, email, phone, resumeUrl } = req.body;
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
export const getApplications = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const apps = await prisma.jobApplication.findMany({
            include: { job: true }
        });
        res.json(apps);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

// Update Application Status (Admin)
export const updateApplicationStatus = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status } = req.body;
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
