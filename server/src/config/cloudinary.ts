import { v2 as cloudinary } from 'cloudinary';

// Using a module-level initialization safely based on environment
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
} else {
    // Graceful warning, won't crash backend but uploads will fail
    console.warn("⚠️ Cloudinary variables missing in .env. Uploads will be disabled.");
}

export default cloudinary;
