import { Request, Response } from 'express';
import { prisma } from '../db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        const user = await prisma.user.findUnique({
            where: { email },
            include: { profile: true, shift: true }
        });
        console.log('User found:', !!user);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!process.env.JWT_SECRET) console.error('JWT_SECRET is missing!');

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '1d' }
        );
        console.log('Token generated');

        const { passwordHash, ...userData } = user;

        res.json({ token, user: userData });
    } catch (error: any) {
        console.error('Login Error:', error);
        const fs = require('fs');
        const logPath = require('path').join('d:/citrux-hrms/server', 'error.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - CWD: ${process.cwd()} - Login Error: ${error?.message}\n${error?.stack}\n\n`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const forgotPassword = async (req: Request, res: Response) => {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(process.cwd(), 'auth_debug.log');
    const log = (msg: string) => fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);

    try {
        const { email } = req.body;
        log(`Forgot Password Request for: ${email}`);

        const user = await prisma.user.findUnique({ where: { email } });
        log(`User found in DB: ${user ? 'YES' : 'NO'} (ID: ${user?.id})`);

        if (!user) {
            log('User not found, returning fake success.');
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // Generate token
        const resetTokenRaw = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

        // Hash the token before saving
        const resetTokenHash = await bcrypt.hash(resetTokenRaw, 10);

        // Save to DB
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: resetTokenHash,
                resetTokenExpiry: new Date(Date.now() + 3600000) // 1 hour
            }
        });

        const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetTokenRaw}`;

        const { sendEmail } = require('../utils/email.service');
        await sendEmail(
            user.email,
            'Password Reset Request',
            `Click here to reset your password: ${resetLink}\n\nThis link will expire in 1 hour.`
        );

        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        // Verify token signature (locally first)
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

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

        // Update user
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
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
