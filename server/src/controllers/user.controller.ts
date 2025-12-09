import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';

export const createUser = async (req: Request, res: Response) => {
    try {
        const { email, password, role, firstName, lastName, phone, designation, employmentType, joiningDate } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role: role || 'EMPLOYEE',
                profile: {
                    create: {
                        firstName,
                        lastName,
                        phone,
                        designation,
                        dateOfJoining: joiningDate ? new Date(joiningDate) : new Date(),
                    }
                }
            },
            include: { profile: true }
        });

        const { passwordHash: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                profile: true
                // Exclude passwordHash
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: { profile: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { passwordHash, ...userData } = user;
        res.json(userData);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role, firstName, lastName, phone, designation } = req.body;

        // First check if user exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'User not found' });

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                role,
                profile: {
                    update: {
                        firstName,
                        lastName,
                        phone,
                        designation
                    }
                }
            },
            include: { profile: true }
        });

        const { passwordHash, ...userData } = updatedUser;
        res.json(userData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Transaction to delete relations if necessary? 
        // Prisma cascading delete might need to be configured or handled manually.
        // For now delete user (Profile cascades if configured in schema, otherwise need to update schema or delete profile first)
        // Prisma default relation is not cascade delete by default unless specified.
        // Let's rely on Prisma client knowing to delete relation if configured?
        // Actually schema didn't specify onDelete: Cascade.

        // We should probably delete related records first or update schema.
        // Updating schema is better in long run, but for now manual.

        const deleteProfile = prisma.profile.deleteMany({ where: { userId: id } });
        const deleteUser = prisma.user.delete({ where: { id } });

        await prisma.$transaction([deleteProfile, deleteUser]);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
