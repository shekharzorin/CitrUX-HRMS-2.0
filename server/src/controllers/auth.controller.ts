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
            include: { profile: true }
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
