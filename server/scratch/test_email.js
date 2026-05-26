const nodemailer = require('nodemailer');
require('dotenv').config({ path: '../.env' });

console.log("SMTP Config:");
console.log("Host:", process.env.SMTP_HOST);
console.log("Port:", process.env.SMTP_PORT);
console.log("User:", process.env.SMTP_USER);
console.log("Pass:", process.env.SMTP_PASS ? "LOADED" : "MISSING");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true,
    family: 4,
});

async function run() {
    try {
        console.log("Attempting to send test email...");
        const info = await transporter.sendMail({
            from: 'iSnap HRMS <onboarding@resend.dev>', // Default testing address with display name
            to: 'shekharzorin@gmail.com',
            subject: 'Test Email',
            text: 'This is a test email.',
        });
        console.log("SUCCESS:", info);
    } catch (err) {
        console.error("ERROR:", err);
    }
}

run();
