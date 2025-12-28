import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'citrux-hrms',
        allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return file.fieldname + '-' + uniqueSuffix;
        }
    } as any
});

export default cloudinary;
