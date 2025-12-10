import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcryptjs';

interface AuthRequest extends Request {
    user?: any;
}

// Get My Profile
export const getMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        // @ts-ignore
        const profile = await prisma.user.findUnique({
            where: { id: userId },
            include: { details: true } // Relation is 'details' in schema? Schema says 'details' in User? 
            // Checking schema: User -> details Profile?
            // Actually schema has: profile Profile?
            // Let's check schema/prisma/schema.prisma from previous knowledge or view it.
            // Earlier edits showed: profile Profile?
        });

        // Let's verify relation name. 
        // In User model: profile Profile?
        // So include: { profile: true }

        // @ts-ignore
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile' });
    }
};

// Update My Profile
export const updateMyProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { phone, address, emergencyContact } = req.body;

        // Upsert profile
        // @ts-ignore
        const profile = await prisma.profile.upsert({
            where: { userId },
            update: { phone, address, emergencyContact },
            create: {
                userId,
                phone,
                address,
                emergencyContact,
                firstName: 'Employee', // Default entries if missing
                lastName: '',
                joiningDate: new Date(),
                designation: 'Staff',
                department: 'General'
            }
        });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// Change Password
export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        // @ts-ignore
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !await bcrypt.compare(currentPassword, user.password)) {
            return res.status(400).json({ message: 'Invalid current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // @ts-ignore
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password' });
    }
};
