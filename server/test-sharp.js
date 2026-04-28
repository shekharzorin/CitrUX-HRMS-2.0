const sharp = require('sharp');
const fs = require('fs');

async function testSharp() {
    try {
        const buffer = fs.readFileSync('test.png');
        const metadata = await sharp(buffer).metadata();
        console.log('Sharp Test Success! Metadata:', metadata);
        
        const resized = await sharp(buffer)
            .resize(10, 10)
            .toBuffer();
        console.log('Sharp Resize Success! Buffer length:', resized.length);
        process.exit(0);
    } catch (err) {
        console.error('Sharp Test Failed:', err);
        process.exit(1);
    }
}

testSharp();
