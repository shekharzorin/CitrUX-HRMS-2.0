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
        const { phone, address, emergencyContact, firstName, lastName, designation, department, profilePhoto, profilePhotoSettings } = req.body;

        const profile = await prisma.profile.upsert({
            where: { userId },
            update: {
                phone,
                address,
                emergencyContact,
                firstName,
                lastName,
                designation,
                department,
                profilePhoto,
                profilePhotoSettings: typeof profilePhotoSettings === 'object' ? JSON.stringify(profilePhotoSettings) : profilePhotoSettings
            },
            create: {
                userId,
                phone,
                address,
                emergencyContact,
                firstName: firstName || 'Employee',
                lastName: lastName || '',
                designation: designation || 'Staff',
                department: department || 'General',
                profilePhoto,
                profilePhotoSettings: typeof profilePhotoSettings === 'object' ? JSON.stringify(profilePhotoSettings) : profilePhotoSettings
            }
        });
        res.json(profile);
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

// Change Password
export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
            return res.status(400).json({ message: 'Invalid current password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Error changing password' });
    }
};
