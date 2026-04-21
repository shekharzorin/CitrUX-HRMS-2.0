import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { uploadToCloudinary } from '../utils/upload';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Configure multer to store files temporarily in the OS's temp directory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = os.tmpdir();
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

/**
 * Validates and authenticates the user before allowing an upload.
 * It strictly uses the backend for upload passing to Cloudinary, ensuring
 * that the API Secret is never exposed to the frontend.
 */
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = req.file.path;

        // Pass to our trusted backend upload utility
        const secureUrl = await uploadToCloudinary(filePath, true);

        return res.status(200).json({ 
            message: "File uploaded successfully",
            url: secureUrl 
        });

    } catch (error: any) {
        console.error("Upload API Error:", error);
        return res.status(500).json({ message: error.message || "Failed to process upload" });
    }
});

export default router;
