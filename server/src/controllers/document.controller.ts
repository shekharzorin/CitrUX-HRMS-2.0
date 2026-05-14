import { Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { notifyUser, notifyRole } from '../utils/notification';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';

// Generate short-lived URL for a document
export const generateSecureUrl = async (req: AuthRequest, res: Response) => {
    try {
        const filename = requireString(req.params.filename);
        const requesterRole = req.user!.role;
        
        const token = jwt.sign(
            { filename, role: requesterRole },
            process.env.JWT_SECRET as string,
            { expiresIn: '5m' }
        );
        
        res.json({ url: `/uploads/${filename}?token=${token}` });
    } catch (error) {
        res.status(500).json({ message: 'Error generating url' });
    }
};

// Upload Document (Employee/Admin)
export const uploadDocument = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId; // Current logged in user
        const requesterRole = req.user!.role;

        const { targetUserId, type, name, expiryDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Determine owner: If Admin/HR, they can upload for others. Employees only for self.
        let ownerId = userId;
        if (targetUserId && (requesterRole === 'ADMIN' || requesterRole === 'HR' || requesterRole === 'SUPER_ADMIN')) {
            // Verify target user is in same company
            // @ts-ignore
            const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
            if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
            if (!assertSameCompany(targetUser.companyId, req, res)) return;
            
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
export const getMyDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
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
export const getUserDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const userId = requireString(req.params.userId);
        
        // Verify target user is in same company
        // @ts-ignore
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

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
export const verifyDocument = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status } = req.body; // VERIFIED, REJECTED
        const verifierId = req.user!.userId;

        // Check ownership/company
        // @ts-ignore
        const existing = await prisma.userDocument.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!existing) return res.status(404).json({ message: 'Document not found' });
        if (!assertSameCompany(existing.user.companyId, req, res)) return;

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
export const getExpiringDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const days = 30; // Check next 30 days
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const scope = getTenantScope(req);

        // @ts-ignore
        const docs = await prisma.userDocument.findMany({
            where: {
                expiryDate: {
                    lte: futureDate,
                    gte: new Date()
                },
                user: {
                    ...scope
                }
            },
            include: { user: { include: { profile: true } } }
        });

        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching expiring documents' });
    }
};
