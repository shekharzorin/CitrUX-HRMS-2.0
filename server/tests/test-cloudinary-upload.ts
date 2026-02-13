
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from server/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('--- Cloudinary Configuration Check ---');
console.log(`Cloud Name: ${cloudName}`);
console.log(`API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'Missing'}`);
console.log(`API Secret: ${apiSecret ? '***' : 'Missing'}`);

if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary configuration is missing. Please check your .env file.');
    process.exit(1);
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
});

const testImage = 'https://res.cloudinary.com/demo/image/upload/sample.jpg'; // Public sample image

console.log('\n--- Starting Upload Test ---');
console.log(`Uploading sample image from: ${testImage}`);

cloudinary.uploader.upload(testImage, { folder: 'citrux-hrms-test' })
    .then(result => {
        console.log('\n✅ Upload Successful!');
        console.log('Public ID:', result.public_id);
        console.log('URL:', result.secure_url);

        // Clean up
        console.log('\n--- Cleaning Up ---');
        return cloudinary.uploader.destroy(result.public_id);
    })
    .then(result => {
        console.log('✅ Delete Successful!');
        console.log('Result:', result);
    })
    .catch(error => {
        console.error('\n❌ Upload Failed:', error);
    });
