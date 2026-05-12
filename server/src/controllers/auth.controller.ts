import { Request, Response } from 'express';
import { prisma, withRetry } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../utils/logger';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Prisma } from '@prisma/client';

function isDbConnectionError(err: any): boolean {
    if (err instanceof Prisma.PrismaClientInitializationError) return true;
    const retriable = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
    if (retriable.has(err?.code)) return true;
    const msg: string = err?.message ?? '';
    return msg.includes("Can't reach database") || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');
}

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        logger.info(`Login attempt: ${email}`);

        const user = await withRetry(() =>
            prisma.user.findUnique({
                where: { email },
                include: { profile: true, shift: true, company: true }
            })
        );
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
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Unable to connect to the database. Please try again in a moment.' });
        }
        res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const user = await withRetry(() =>
            prisma.user.findUnique({
                where: { id: userId },
                include: { profile: true, shift: true }
            })
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        const { passwordHash, ...userData } = user;
        res.json(userData);
    } catch (error: any) {
        logger.error(`GetMe Error: ${error.message}`);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again.' });
        }
        res.status(500).json({ message: 'An unexpected error occurred.' });
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
        // Handle multiple origins in CLIENT_URL (Render config)
        const allowedOrigins = (process.env.CLIENT_URL || '').split(',');
        const requestOrigin = req.get('origin');
        
        // Use request origin if allowed, otherwise first origin, otherwise fallback
        const baseUrl = (requestOrigin && allowedOrigins.includes(requestOrigin)) 
            ? requestOrigin 
            : (allowedOrigins[0] || 'http://localhost:5173');

        const resetLink = `${baseUrl}/reset-password?token=${resetTokenRaw}&uid=${user.id}`;

        const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f5; color: #3f3f46; border-radius: 8px;">
                <h2 style="color: #f97316; text-align: center; margin-bottom: 24px;">Citrux HRMS</h2>
                <div style="background-color: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <h3 style="margin-top: 0; color: #18181b; font-size: 20px;">Password Reset Request</h3>
                    <p style="font-size: 16px; line-height: 1.5;">We received a request to reset the password for your Citrux HRMS account.</p>
                    <p style="font-size: 16px; line-height: 1.5;">Click the button below to securely reset your password. This link will expire in 1 hour.</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resetLink}" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">Securely Reset Password</a>
                    </div>
                    <p style="font-size: 14px; color: #71717a; margin-bottom: 0;">If you didn't request a password reset, you can safely ignore this email.</p>
                </div>
                <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #a1a1aa;">
                    <p>&copy; ${new Date().getFullYear()} Citrux HRMS. All rights reserved.</p>
                    <p>Need help? Contact HR Support.</p>
                </div>
            </div>
        `;

        const { sendEmail } = require('../utils/email.service');
        await sendEmail(
            user.email,
            'Password Reset Request - Citrux HRMS',
            `Click here to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.`,
            htmlTemplate
        );

        logger.info(`Forgot Password Email sent to: ${email}`);
        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });

    } catch (error: any) {
        logger.error('Forgot Password Error:', error);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again in a moment.' });
        }
        res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, uid, newPassword } = req.body;

        if (!token || !uid || !newPassword) {
            logger.warn(`Reset Password Attempt Failed: Missing fields for uid ${uid}`);
            return res.status(400).json({ message: 'Token, uid, and new password are required' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            logger.warn(`Reset Password Attempt Failed: Weak password provided for uid ${uid}`);
            return res.status(400).json({ message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.' });
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

        logger.info(`Password successfully reset for uid: ${user.id}`);
        res.json({ message: 'Password reset successful' });

    } catch (error: any) {
        logger.error('Reset Password Error:', error);
        if (isDbConnectionError(error)) {
            return res.status(503).json({ message: 'Service temporarily unavailable. Please try again in a moment.' });
        }
        res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
    }
};
