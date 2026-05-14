import { Response } from 'express';
import { prisma } from '../db';
import { requireString } from '../utils/requestUtils';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope, assertSameCompany } from '../middlewares/tenant.middleware';

// Create Asset (Admin)
export const createAsset = async (req: AuthRequest, res: Response) => {
    try {
        const { name, type, serialNumber, purchasedAt } = req.body;
        const companyId = req.user!.companyId;

        // @ts-ignore
        const asset = await prisma.asset.create({
            data: { 
                name, 
                type, 
                serialNumber, 
                companyId,
                purchasedAt: purchasedAt ? new Date(purchasedAt) : null 
            }
        });
        res.json(asset);
    } catch (error) {
        res.status(500).json({ message: 'Error creating asset' });
    }
};

// Get All Assets (Admin)
export const getAllAssets = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        // @ts-ignore
        const assets = await prisma.asset.findMany({
            where: scope,
            include: { user: { include: { profile: true } } }
        });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assets' });
    }
};

// Assign Asset (Admin)
export const assignAsset = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const { userId } = req.body;

        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) return res.status(404).json({ message: 'Asset not found' });
        if (!assertSameCompany(asset.companyId, req, res)) return;

        // Verify target user is in same company
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        if (!assertSameCompany(targetUser.companyId, req, res)) return;

        // @ts-ignore
        const updated = await prisma.asset.update({
            where: { id },
            data: { assignedTo: userId, status: 'ASSIGNED' }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error assigning asset' });
    }
};

// Return Asset (Admin)
export const returnAsset = async (req: AuthRequest, res: Response) => {
    try {
        const id = requireString(req.params.id);

        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) return res.status(404).json({ message: 'Asset not found' });
        if (!assertSameCompany(asset.companyId, req, res)) return;

        // @ts-ignore
        const updated = await prisma.asset.update({
            where: { id },
            data: { assignedTo: null, status: 'AVAILABLE' }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Error returning asset' });
    }
};

// Get My Assets (Employee)
export const getMyAssets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        // @ts-ignore
        const assets = await prisma.asset.findMany({
            where: { assignedTo: userId }
        });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching my assets' });
    }
};
