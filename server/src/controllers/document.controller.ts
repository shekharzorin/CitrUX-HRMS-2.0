import { Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { notifyUser, notifyRole } from '../utils/notification';
import jwt from 'jsonwebtoken';
import { UploadService } from '../services/upload.service';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';
import path from 'path';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';

// Generate short-lived URL for a document
export const generateSecureUrl = async (req: AuthRequest, res: Response) => {
    try {
        const filepath = req.params[0]; // Capture the wildcards from route /generate-url/*
        const filename = filepath || requireString(req.params.filename);
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

// Upload Document (Employee/Admin/HR/Manager)
export const uploadDocument = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId; // Current logged in user
        const requesterRole = req.user!.role;

        const { targetUserId, category, name, expiryDate, notes, tags, parentDocId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Determine owner: If Admin/HR/Manager, they can upload for others. Employees only for self.
        let ownerId = userId;
        if (targetUserId && targetUserId !== userId) {
            if (requesterRole === 'EMPLOYEE') {
                return res.status(403).json({ message: 'Employees can only upload their own documents' });
            }
            
            // Verify target user is in same company
            const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
            if (!targetUser) return res.status(404).json({ message: 'Target user not found' });
            if (!assertSameCompany(targetUser.companyId, req, res)) return;
            
            // Manager check: can only upload for subordinates
            if (requesterRole === 'MANAGER') {
                if (targetUser.managerId !== userId) {
                    return res.status(403).json({ message: 'Managers can only upload for direct subordinates' });
                }
            }
            
            ownerId = targetUserId;
        }

        const expiry = expiryDate ? new Date(expiryDate) : null;
        let version = 1;
        
        // Handle Versioning
        if (parentDocId) {
            const parentDoc = await prisma.userDocument.findUnique({ where: { id: parentDocId } });
            if (!parentDoc) {
                return res.status(404).json({ message: 'Parent document not found' });
            }
            version = parentDoc.version + 1;
            
            // Mark parent as not latest
            await prisma.userDocument.update({
                where: { id: parentDocId },
                data: { isLatest: false }
            });
        }

        // Use centralized UploadService
        const owner = await prisma.user.findUnique({ where: { id: ownerId }, include: { profile: true } });
        const userFolder = owner?.employeeId || ownerId;
        const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '');
        
        const fileUrl = await UploadService.uploadDocument(
            file.buffer,
            name || file.originalname,
            `${userFolder}/${safeCategory}`
        );

        const doc = await prisma.userDocument.create({
            data: {
                userId: ownerId,
                category,
                name: name || file.originalname,
                url: fileUrl,
                fileSize: file.size,
                fileType: file.mimetype,
                uploadedById: userId,
                expiryDate: expiry,
                notes,
                tags,
                status: 'ACTIVE',
                version,
                parentDocId,
                isLatest: true
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

// Update Document Metadata
export const updateDocument = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { name, category, expiryDate, notes, tags } = req.body;
        const requesterRole = req.user!.role;
        const userId = req.user!.userId;

        const existing = await prisma.userDocument.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!existing) return res.status(404).json({ message: 'Document not found' });
        if (!assertSameCompany(existing.user.companyId, req, res)) return;

        // Access Control
        if (requesterRole === 'EMPLOYEE' && existing.userId !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (requesterRole === 'MANAGER' && existing.user.managerId !== userId) {
            return res.status(403).json({ message: 'Managers can only edit subordinate documents' });
        }

        const doc = await prisma.userDocument.update({
            where: { id },
            data: {
                name,
                category,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                notes,
                tags
            }
        });
        res.json(doc);
    } catch (error) {
        res.status(500).json({ message: 'Error updating document' });
    }
};

// Delete Document (Soft delete / Archive)
export const deleteDocument = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const requesterRole = req.user!.role;
        const userId = req.user!.userId;

        const existing = await prisma.userDocument.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!existing) return res.status(404).json({ message: 'Document not found' });
        const doc = await prisma.userDocument.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!doc) return res.status(404).json({ message: 'Document not found' });
        if (!assertSameCompany(doc.user.companyId, req, res)) return;

        // Access Control
        if (requesterRole === 'EMPLOYEE' && doc.userId !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (requesterRole === 'MANAGER' && doc.user.managerId !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Use centralized UploadService for deletion
        await UploadService.deleteDocument(doc.url);

        await prisma.userDocument.delete({ where: { id } });

        // Audit Trail
        await AuditService.log(
            userId,
            'DELETE',
            'DOCUMENT',
            id,
            { name: doc.name }
        );

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting document' });
    }
};

// Get My Documents
export const getMyDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const docs = await prisma.userDocument.findMany({
            where: { userId, status: 'ACTIVE', isLatest: true },
            orderBy: { uploadedAt: 'desc' },
            include: { uploader: { select: { profile: { select: { firstName: true, lastName: true } } } } }
        });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching documents' });
    }
};

// Get User Documents (Admin/HR/Manager)
export const getUserDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const targetUserId = requireString(req.params.userId);
        const requesterRole = req.user!.role;
        const userId = req.user!.userId;
        
        // Verify target user is in same company
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

        // Access Control
        if (requesterRole === 'MANAGER' && targetUser.managerId !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Restrict protected categories based on role
        let categoryFilter: any = undefined;
        if (requesterRole === 'MANAGER') {
            categoryFilter = { notIn: ['SALARY_SLIP', 'INTERNAL'] };
        }

        const docs = await prisma.userDocument.findMany({
            where: { 
                userId: targetUserId, 
                status: 'ACTIVE',
                isLatest: true,
                ...(categoryFilter ? { category: categoryFilter } : {})
            },
            orderBy: { uploadedAt: 'desc' },
            include: { uploader: { select: { profile: { select: { firstName: true, lastName: true } } } } }
        });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching documents' });
    }
};

// Get All Company Documents (Admin/HR)
export const getAllCompanyDocuments = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        const docs = await prisma.userDocument.findMany({
            where: {
                status: 'ACTIVE',
                isLatest: true,
                user: { ...scope }
            },
            include: { 
                user: { select: { email: true, employeeId: true, profile: { select: { firstName: true, lastName: true } } } },
                uploader: { select: { profile: { select: { firstName: true, lastName: true } } } }
            },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching company documents' });
    }
};

// Verify Document (Admin/HR)
export const verifyDocument = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { status } = req.body; // VERIFIED, REJECTED
        const verifierId = req.user!.userId;

        const existing = await prisma.userDocument.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!existing) return res.status(404).json({ message: 'Document not found' });
        if (!assertSameCompany(existing.user.companyId, req, res)) return;

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

        const docs = await prisma.userDocument.findMany({
            where: {
                expiryDate: {
                    lte: futureDate,
                    gte: new Date()
                },
                status: 'ACTIVE',
                isLatest: true,
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
