import { Readable } from 'stream';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { cloudinary } from '../config/cloudinary';
import logger from '../utils/logger';

export class UploadService {
    /**
     * Upload a raw file (PDF, DOCX, image, etc.) to Cloudinary.
     *
     * Previously this wrote to a local `uploads/` directory, which is ephemeral
     * on PaaS (lost on every deploy) and not shared across instances. Storing in
     * Cloudinary makes documents durable and available from any instance.
     *
     * @returns The Cloudinary secure URL of the uploaded file.
     */
    static async uploadDocument(buffer: Buffer, originalName: string, folder: string = 'documents'): Promise<string> {
        const ext = path.extname(originalName).replace('.', '').toLowerCase();
        const publicId = `${uuidv4()}`;

        return new Promise<string>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `hrms/documents/${folder}`,
                    public_id: publicId,
                    // 'auto' lets Cloudinary store images as images and other
                    // file types (PDF/DOCX/ZIP) as raw, preserving the original.
                    resource_type: 'auto',
                    format: ext || undefined,
                },
                (error, result) => {
                    if (error || !result) {
                        logger.error('[UploadService] Cloudinary upload failed', error);
                        return reject(new Error('File upload failed.'));
                    }
                    resolve(result.secure_url);
                }
            );
            Readable.from(buffer).pipe(uploadStream);
        });
    }

    /**
     * Delete a previously uploaded document from Cloudinary.
     * Derives the public_id (and resource type) from the stored secure URL.
     */
    static async deleteDocument(fileUrl: string): Promise<boolean> {
        try {
            if (!fileUrl.includes('res.cloudinary.com')) {
                // Legacy local URL (or external) — nothing to delete in Cloudinary.
                return true;
            }

            // URL shape: https://res.cloudinary.com/<cloud>/<resource_type>/upload/v<ver>/<public_id>.<ext>
            const parts = fileUrl.split('/upload/');
            if (parts.length < 2) return true;

            const resourceType = parts[0].split('/').slice(-1)[0] || 'image';
            // Strip version prefix and file extension to recover the public_id.
            const afterUpload = parts[1].replace(/^v\d+\//, '');
            const publicId = afterUpload.replace(/\.[^/.]+$/, '');

            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
            return true;
        } catch (error) {
            logger.error('[UploadService] Failed to delete document from Cloudinary', error);
            return false;
        }
    }
}
