import { Router } from 'express';
import { handleImageUpload } from '../controllers/upload.controller';
import { uploadMemory } from '../middlewares/upload.middleware';
import { authenticateToken } from '../middlewares/auth.middleware';
import { uploadToCloudinary } from '../utils/upload';
import multer from 'multer';
import os from 'os';
import path from 'path';

const router = Router();

// Standard Disk Storage for generic files (like PDFs)
const diskUpload = multer({ 
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, os.tmpdir()),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
    })
});

/**
 * Endpoint for processed images (avatars, logos, etc.)
 * Uses Sharp for optimization and multi-size generation.
 */
router.post('/image', authenticateToken, uploadMemory.single('file'), handleImageUpload);

/**
 * Existing Generic File Upload (e.g. PDFs, documents)
 * Still uses disk storage and basic cloudinary upload.
 */
router.post('/', authenticateToken, diskUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const filePath = req.file.path;
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
