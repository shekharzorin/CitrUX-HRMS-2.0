const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'citruxhrms',
    api_key: '971156652528485',
    api_secret: 'YektevBGSyPYG7QBTp-ouwgdqgk'
});

async function testCloudinary() {
    try {
        const result = await cloudinary.api.ping();
        console.log('Cloudinary Connection Success!', result);
        process.exit(0);
    } catch (err) {
        console.error('Cloudinary Connection Failed:', err.message || err);
        process.exit(1);
    }
}

testCloudinary();
