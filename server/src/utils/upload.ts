import cloudinary from '../config/cloudinary';
import fs from 'fs';

/**
 * Uploads a local file to Cloudinary within the 'citrux_hrms' folder.
 * Returns the secure_url of the uploaded asset.
 * 
 * @param filePath The local path to the file
 * @param removeLocal After successful upload, delete the local file
 */
export const uploadToCloudinary = async (filePath: string, removeLocal: boolean = true): Promise<string> => {
    try {
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            throw new Error("Cloudinary configuration missing");
        }

        const result = await cloudinary.uploader.upload(filePath, {
            folder: "citrux_hrms",
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
