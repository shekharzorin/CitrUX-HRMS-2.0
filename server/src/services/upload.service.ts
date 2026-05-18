import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class UploadService {
    /**
     * Upload a raw file (PDF, DOCX, ZIP, etc.) to a local directory or cloud storage.
     * @param buffer The file buffer
     * @param originalName The original filename
     * @param folder The destination folder path
     * @returns The relative or absolute URL of the uploaded file
     */
    static async uploadDocument(buffer: Buffer, originalName: string, folder: string = 'documents'): Promise<string> {
        // In a real production environment, this would upload to AWS S3, Azure Blob, or Google Cloud.
        // For now, we simulate saving to a local 'uploads' directory.
        try {
            const ext = path.extname(originalName);
            const fileName = `${uuidv4()}${ext}`;
            const uploadDir = path.join(process.cwd(), 'uploads', folder);

            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, buffer);

            // Return relative URL for static hosting
            return `/uploads/${folder}/${fileName}`;
        } catch (error) {
            console.error('[UploadService] Failed to upload document:', error);
            throw new Error('File upload failed.');
        }
    }

    /**
     * Delete a previously uploaded document.
     * @param fileUrl The URL/path of the file to delete
     */
    static async deleteDocument(fileUrl: string): Promise<boolean> {
        try {
            // Simulated cloud deletion. If using local storage:
            if (fileUrl.startsWith('/uploads/')) {
                const filePath = path.join(process.cwd(), fileUrl);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return true;
        } catch (error) {
            console.error('[UploadService] Failed to delete document:', error);
            return false;
        }
    }
}
