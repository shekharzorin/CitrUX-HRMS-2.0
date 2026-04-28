import multer from 'multer';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

import { cloudinary } from '../config/cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req: any, file: any, cb: any) => {
    // Accept images and PDFs
    logger.info(`[Upload Middleware] Processing file: ${file.originalname}, mimetype: ${file.mimetype}`);
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only images and PDF files are allowed!'), false);
    }
};

const cloudinaryStorage = (CloudinaryStorage as any)({
    cloudinary: cloudinary as any,
    params: {
        folder: 'hrms',
        allowed_formats: ['jpg', 'png', 'gif', 'jpeg', 'pdf'],
    },
});

export const upload = multer({
    storage: cloudinaryStorage || diskStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Memory storage for sharp processing
const memoryStorage = multer.memoryStorage();
export const uploadMemory = multer({
    storage: memoryStorage,
    fileFilter: (req: any, file: any, cb: any) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file format. Only JPG, PNG, and WebP are allowed.'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // Hard limit 10MB to prevent DoS
});
