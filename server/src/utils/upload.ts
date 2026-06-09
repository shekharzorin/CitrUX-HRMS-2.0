import { cloudinary } from '../config/cloudinary';
import fs from 'fs';

/**
 * Uploads a local file to Cloudinary within the 'citrux_hrms' folder.
 * Returns the secure_url of the uploaded asset.
 * 
 * @param filePath The local path to the file
 * @param removeLocal After successful upload, delete the local file
 * @param subfolder Optional tenant/scope subfolder (e.g. companyId) for isolation
 */
export const uploadToCloudinary = async (filePath: string, removeLocal: boolean = true, subfolder?: string): Promise<string> => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            throw new Error("Cloudinary configuration missing");
        }

        // Sanitize subfolder to a safe path segment (no traversal).
        const safe = (subfolder ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
        const folder = safe ? `citrux_hrms/${safe}` : 'citrux_hrms';

        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: "auto" // Auto-detects image, raw, document types
        });

        // Safely remove the local file
        if (removeLocal && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return result.secure_url;
    } catch (error: any) {
        // Safe cleanup on error
        if (removeLocal && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.error("Cloudinary Upload Error:", error.message || error);
        throw new Error("File upload to Cloud failed");
    }
};
