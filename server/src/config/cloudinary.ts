import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = cloudName && apiKey && apiSecret && 
                    !cloudName.startsWith('postgresql://') && // Basic validation to catch copy-paste errors
                    cloudName !== 'undefined';

console.log('[Cloudinary Config] Check:', {
    hasCloudName: !!cloudName,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    isConfigured,
    cwd: process.cwd()
});

let storage: any = null;

if (isConfigured) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    });

    try {
        storage = new CloudinaryStorage({
            cloudinary: cloudinary,
            params: {
                folder: 'citrux-hrms',
                allowed_formats: ['jpg', 'png', 'pdf', 'jpeg', 'ico', 'svg', 'webp'],
                public_id: (req: any, file: any) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    return file.fieldname + '-' + uniqueSuffix;
                }
            } as any
        });
        console.log('[Cloudinary Config] Cloudinary storage configured successfully.');
    } catch (error) {
        console.error('[Cloudinary Config] Error creating CloudinaryStorage:', error);
        storage = null;
    }
} else {
    console.warn('[Cloudinary Config] Missing or invalid environment variables. Falling back to local storage.');
}

export { storage };
export default cloudinary;
