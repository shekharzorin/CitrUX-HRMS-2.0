import { Request, Response } from 'express';
import { processAndUploadImage, getGlobalImageSettings } from '../services/image.service';
import logger from '../utils/logger';

/**
 * Controller to handle centralized image uploads with processing.
 * Expects 'file' and 'type' (e.g., 'profile', 'logo', 'favicon') in the request.
 */
export const handleImageUpload = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided.' });
        }

        const settings = await getGlobalImageSettings();
        const maxBytes = settings.maxUploadSizeMB * 1024 * 1024;

        if (req.file.size > maxBytes) {
            return res.status(400).json({ 
                message: `File too large. Maximum allowed size is ${settings.maxUploadSizeMB}MB.` 
            });
        }

        const type = req.body.type || 'general';
        const folder = `citrux_hrms/${type}`;

        // Process image (optimized, medium, thumbnail) and upload to Cloudinary
        const urls = await processAndUploadImage(req.file.buffer, req.file.originalname, folder);

        logger.info(`[Upload Controller] Successfully processed and uploaded image type: ${type}`);

        res.status(200).json({
            message: 'Image uploaded and processed successfully',
            urls
        });
    } catch (error: any) {
        logger.error('[Upload Controller] Error:', error);
        res.status(500).json({ 
            message: error.message || 'Image processing failed',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
