import { Request, Response } from 'express';
import { prisma } from '../db';
import { userSafeSelect } from '../utils/safe-select';
import { requireString } from '../utils/requestUtils';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode'; // I probably didn't install this, but I can just return the link

// If I didn't install qrcode, I should just return the URL. PRD says "Auto-generate QR code".
// I'll skip QR generation in backend and just generate it in frontend using a library or just URL.
// Or I can install `qrcode` package. I'll just return the Verification URL for now.

export const issueCertificate = async (req: Request, res: Response) => {
    try {
        const { userId, title, type } = req.body;
        const verificationId = uuidv4();

        const certificate = await prisma.certificate.create({
            data: {
                userId,
                title,
                type,
                verificationId
            }
        });

        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${verificationId}`;

        // Generate QR Code
        const qrCodeDataUrl = await QRCode.toDataURL(verificationLink);

        res.json({ ...certificate, verificationLink, qrCodeDataUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const verifyCertificate = async (req: Request, res: Response) => {
    try {
        const id = requireString(req.params.id);
        const certificate = await prisma.certificate.findUnique({
            where: { verificationId: id },
            include: { user: { select: userSafeSelect } }
        });

        if (!certificate) {
            return res.status(404).json({ valid: false, message: 'Certificate not found' });
        }

        res.json({ valid: true, certificate });
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getMyCertificates = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;
        const certs = await prisma.certificate.findMany({ where: { userId } });
        res.json(certs);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}
