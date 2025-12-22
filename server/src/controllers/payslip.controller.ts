import { Request, Response } from 'express';
import { prisma } from '../db';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export const upload = multer({ storage });

interface AuthRequest extends Request {
    user?: any;
}

export const uploadPayslip = async (req: AuthRequest, res: Response) => {
    try {
        const { userId, month, year, gross, net } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const payslip = await prisma.payslip.create({
            data: {
                userId,
                month: parseInt(month),
                year: parseInt(year),
                gross: parseFloat(gross),
                net: parseFloat(net),
                url: file.path,
                details: `Payslip for ${month}/${year}`
            }
        });

        res.json(payslip);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getMyPayslips = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const payslips = await prisma.payslip.findMany({
            where: { userId },
            orderBy: { year: 'desc', month: 'desc' }
        });
        res.json(payslips);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
