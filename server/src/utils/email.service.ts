import nodemailer from "nodemailer";

// 🔍 HARD CHECK ENV (VERY IMPORTANT)
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ SMTP ENV NOT LOADED PROPERLY");
    console.log({
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS ? "LOADED" : "MISSING",
    });
}

// ✅ Create transporter WITH DEBUG
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for 587
    ignoreTLS: false,
    requireTLS: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    logger: true,
    debug: true,
    // Force IPv4 to avoid timeouts on some networks
    family: 4,
} as nodemailer.TransportOptions);

// ✅ Verify connection ON STARTUP
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP VERIFY FAILED:", error);
    } else {
        console.log("✅ SMTP SERVER READY");
    }
});

import fs from 'fs';
import path from 'path';

export const sendEmail = async (
    to: string,
    subject: string,
    text: string,
    html?: string
) => {
    const logFile = path.join(process.cwd(), 'email_debug.log');
    const log = (msg: string) => fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);

    log(`Attempting to send email to: ${to}`);

    // DEV FALLBACK
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        log("⚠️ SMTP creds missing. Email skipped.");
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER, // SIMPLE SENDER (No Alias)
            to,
            subject,
            text,
            html,
        });

        log(`✅ Email sent successfully! MessageID: ${info.messageId}`);
        log(`Response: ${info.response}`);
    } catch (error: any) {
        log(`❌ Error sending email: ${error.message}`);
        console.error("❌ Error sending email:", error);
    }
};
