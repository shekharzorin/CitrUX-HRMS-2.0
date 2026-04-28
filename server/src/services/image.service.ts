import sharp from 'sharp';
import cloudinary from '../config/cloudinary';
import { prisma } from '../db';
import logger from '../utils/logger';

// Load default settings but merge with DB settings dynamically
const DEFAULT_SETTINGS = {
    maxUploadSizeMB: 5,
    maxWidth: 1200,
    compressionQuality: 80,
    autoConvertToWebP: true,
};

export async function getGlobalImageSettings() {
    try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'GLOBAL_IMAGE_SETTINGS' } });
        if (setting?.value) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(setting.value) };
        }
    } catch (e) {
        logger.warn("Failed to fetch GLOBAL_IMAGE_SETTINGS, using defaults");
    }
    return DEFAULT_SETTINGS;
}

export interface ProcessedImages {
    originalUrl: string;
    mediumUrl: string;
    thumbnailUrl: string;
}

/**
 * Uploads a buffer directly to Cloudinary using a stream.
 */
const uploadBufferToCloudinary = async (buffer: Buffer, folder: string, filename: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: filename,
                resource_type: 'image',
            },
            (error, result) => {
                if (error || !result) return reject(error);
                resolve(result.secure_url);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Main Processing Pipeline
 */
export const processAndUploadImage = async (
    fileBuffer: Buffer,
    originalName: string,
    folder: string
): Promise<ProcessedImages> => {
    const settings = await getGlobalImageSettings();
    const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const format = settings.autoConvertToWebP ? 'webp' : 'jpeg';
    
    // 1. Initialize Sharp
    let imageProcessor = sharp(fileBuffer).rotate(); // auto-rotate based on EXIF

    // 2. Original Optimized (Capped at maxWidth)
    const originalBuffer = await imageProcessor
        .clone()
        .resize({ width: settings.maxWidth, withoutEnlargement: true })
        .toFormat(format as any, { quality: settings.compressionQuality })
        .toBuffer();

    // 3. Medium (300x300)
    const mediumBuffer = await imageProcessor
        .clone()
        .resize({ width: 300, height: 300, fit: 'cover' })
        .toFormat(format as any, { quality: settings.compressionQuality - 10 })
        .toBuffer();

    // 4. Thumbnail (100x100)
    const thumbBuffer = await imageProcessor
        .clone()
        .resize({ width: 100, height: 100, fit: 'cover' })
        .toFormat(format as any, { quality: settings.compressionQuality - 20 })
        .toBuffer();

    // Upload all 3 concurrently
    const [originalUrl, mediumUrl, thumbnailUrl] = await Promise.all([
        uploadBufferToCloudinary(originalBuffer, folder, `${baseName}_orig`),
        uploadBufferToCloudinary(mediumBuffer, folder, `${baseName}_med`),
        uploadBufferToCloudinary(thumbBuffer, folder, `${baseName}_thumb`)
    ]);

    return { originalUrl, mediumUrl, thumbnailUrl };
};
