
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:5001';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.jpg');

// Create a valid dummy image (Small transparent PNG)
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync(TEST_IMAGE_PATH, pixel);

async function runTest() {
    try {
        console.log('--- Logo Upload Test ---');

        // 1. Login to get token
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
            email: 'admin@citrux.com',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        if (!token) throw new Error('No token received');
        console.log('✅ Login successful');

        // 2. Upload Image
        console.log('2. Uploading Test Image...');
        const form = new FormData();
        // Add explicit filename and content-type
        form.append('file', fs.createReadStream(TEST_IMAGE_PATH), {
            filename: 'test-logo.png',
            contentType: 'image/png',
        });

        const uploadRes = await axios.post(`${API_URL}/api/onboarding/upload`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        const uploadedUrl = uploadRes.data.url;
        console.log('✅ Upload successful');
        console.log(`URL: ${uploadedUrl}`);

        // 3. Verify URL Type
        const isCloudinary = uploadedUrl.startsWith('http') && uploadedUrl.includes('cloudinary');
        const isLocal = uploadedUrl.includes('localhost') || uploadedUrl.startsWith('/');

        if (process.env.CLOUDINARY_CLOUD_NAME) {
            if (isCloudinary) console.log('✅ Correctly used Cloudinary storage');
            else console.warn('⚠️ WARNING: Cloudinary vars present but returning local URL?');
        } else {
            if (isLocal) console.log('✅ Correctly used Local storage (Fallback)');
            else console.warn('⚠️ WARNING: Expected local URL but got something else');
        }

    } catch (error: any) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
        process.exit(1);
    } finally {
        // Cleanup dummy file
        if (fs.existsSync(TEST_IMAGE_PATH) && fs.readFileSync(TEST_IMAGE_PATH).toString() === 'dummy image content') {
            fs.unlinkSync(TEST_IMAGE_PATH);
        }
    }
}

runTest();
