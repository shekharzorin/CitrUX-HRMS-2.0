import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../utils/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        logger.info(`Login attempt: ${email}`);

        const user = await prisma.user.findUnique({
            where: { email },
            include: { profile: true, shift: true }
        });
        logger.info(`User found: ${!!user}`);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.status === 'INACTIVE') {
            return res.status(403).json({ message: 'Account has been deactivated. Contact HR.' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        logger.info(`Password match: ${isMatch}`);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) logger.error('JWT_SECRET is missing!');

        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
                companyId: user.companyId ?? null,  // Multi-tenant: companyId scoped into every token
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '8h' }
        );
        logger.info('Token generated');

        const { passwordHash, ...userData } = user;

        res.json({ token, user: userData });
    } catch (error: any) {
        logger.error(`Login Error: ${error.message}`, { stack: error.stack });
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true, shift: true }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        const { passwordHash, ...userData } = user;
        res.json(userData);
    } catch (error: any) {
        logger.error(`GetMe Error: ${error.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        logger.info(`Forgot Password Request for: ${email}`);

        const user = await prisma.user.findUnique({ where: { email } });
        logger.info(`User found in DB: ${user ? 'YES' : 'NO'} (ID: ${user?.id})`);

        if (!user) {
            logger.info('User not found, returning fake success.');
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // Generate a cryptographically secure random token (NOT a JWT — prevents reuse attacks)
        const resetTokenRaw = crypto.randomBytes(32).toString('hex');

        // Hash the token before saving to DB
        const resetTokenHash = await bcrypt.hash(resetTokenRaw, 10);

        // Save to DB
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetTokenHash,
                resetTokenExpiry: new Date(Date.now() + 3600000) // 1 hour
            }
        });

        // Include uid so reset endpoint can find the user without decoding a JWT
        const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetTokenRaw}&uid=${user.id}`;

        const { sendEmail } = require('../utils/email.service');
        await sendEmail(
            user.email,
            'Password Reset Request',
            `Click here to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.`
        );

        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });

    } catch (error) {
        logger.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, uid, newPassword } = req.body;

        if (!token || !uid || !newPassword) {
            return res.status(400).json({ message: 'Token, uid, and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: uid } });

        if (!user || !user.resetToken || !user.resetTokenExpiry) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Check expiry (DB side backup)
        if (user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Verify against hash
        const isValidToken = await bcrypt.compare(token, user.resetToken);
        if (!isValidToken) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update user — clear reset token to prevent reuse
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        logger.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
