import { Request, Response } from 'express';
import { prisma } from '../db';

interface AuthRequest extends Request {
    user?: any;
}

// Create Asset (Admin)
export const createAsset = async (req: Request, res: Response) => {
    try {
        const { name, type, serialNumber, purchasedAt } = req.body;
        // @ts-ignore
        const asset = await prisma.asset.create({
            data: { name, type, serialNumber, purchasedAt: purchasedAt ? new Date(purchasedAt) : null }
        });
        res.json(asset);
    } catch (error) {
        res.status(500).json({ message: 'Error creating asset' });
    }
};

// Get All Assets (Admin)
export const getAllAssets = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const assets = await prisma.asset.findMany({
            include: { user: { include: { profile: true } } }
        });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assets' });
    }
};

// Assign Asset (Admin)
export const assignAsset = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
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
export const returnAsset = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
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
        const userId = req.user.userId;
        // @ts-ignore
        const assets = await prisma.asset.findMany({
            where: { assignedTo: userId }
        });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching my assets' });
    }
};
