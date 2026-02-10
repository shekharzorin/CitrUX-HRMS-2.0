import { Request, Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { notifyUser, notifyRole } from '../utils/notification';

// Upload Document (Employee/Admin)
export const uploadDocument = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.userId; // Current logged in user
        // @ts-ignore
        const requesterRole = req.user.role;

        const { targetUserId, type, name, expiryDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Determine owner: If Admin/HR, they can upload for others. Employees only for self.
        let ownerId = userId;
        if (targetUserId && (requesterRole === 'ADMIN' || requesterRole === 'HR')) {
            ownerId = targetUserId;
        }

        const expiry = expiryDate ? new Date(expiryDate) : null;

        // @ts-ignore
        const doc = await prisma.userDocument.create({
            data: {
                userId: ownerId,
                type,
                name,
                url: `/uploads/${file.filename}`,
                expiryDate: expiry,
                status: 'PENDING'
            }
        });

        // Notify HR if employee uploaded
        if (ownerId === userId && requesterRole === 'EMPLOYEE') {
            await notifyRole(['HR', 'ADMIN'], `New Document Uploaded by User ${userId}`, '/documents', 'TASK');
        }

        res.json(doc);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading document' });
    }
};

// Get My Documents
export const getMyDocuments = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.userId;
        // @ts-ignore
        const docs = await prisma.userDocument.findMany({
            where: { userId },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching documents' });
    }
};

// Get User Documents (Admin)
export const getUserDocuments = async (req: Request, res: Response) => {
    try {
        const userId = requireString(req.params.userId);
        // @ts-ignore
        const docs = await prisma.userDocument.findMany({
            where: { userId },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching documents' });
    }
};

// Verify Document (Admin/HR)
export const verifyDocument = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status } = req.body; // VERIFIED, REJECTED
        // @ts-ignore
        const verifierId = req.user.userId;

        // @ts-ignore
        const doc = await prisma.userDocument.update({
            where: { id },
            data: {
                status,
                verifiedBy: verifierId
            }
        });

        // Notify User
        await notifyUser(doc.userId, `Document ${doc.name} was ${status}`, '/my-documents', 'INFO');

        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: 'Error verifying document' });
    }
};

// Get Expiring Documents (Admin Report)
export const getExpiringDocuments = async (req: Request, res: Response) => {
    try {
        const days = 30; // Check next 30 days
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        // @ts-ignore
        const docs = await prisma.userDocument.findMany({
            where: {
                expiryDate: {
                    lte: futureDate,
                    gte: new Date()
                }
            },
            include: { user: { include: { profile: true } } }
        });

        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching expiring documents' });
    }
};
