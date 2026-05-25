import nodemailer from "nodemailer";

// 🔍 HARD CHECK ENV (VERY IMPORTANT)
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️ SMTP ENV NOT LOADED PROPERLY");
    if (process.env.NODE_ENV === 'production') {
        throw new Error("CRITICAL: SMTP credentials are required in production.");
    } else {
        console.log({
            SMTP_HOST: process.env.SMTP_HOST,
            SMTP_USER: process.env.SMTP_USER,
            SMTP_PASS: process.env.SMTP_PASS ? "LOADED" : "MISSING",
        });
    }
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

import { promises as fs } from 'fs';
import path from 'path';

export const sendEmail = async (
    to: string,
    subject: string,
    text?: string,
    html?: string,
    fromEmail?: string
) => {
    const logFile = path.join(process.cwd(), 'email_debug.log');
    const log = async (msg: string) => {
        try {
            await fs.appendFile(logFile, `[${new Date().toISOString()}] ${msg}\n`);
        } catch (err) {
            console.error("Failed to write to email_debug.log:", err);
        }
    };

    log(`Attempting to send email to: ${to}`);

    // DEV FALLBACK
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        await log("⚠️ SMTP credentials missing. Dev Fallback:");
        await log(`To: ${to}`);
        await log(`Subject: ${subject}`);
        await log(`Content:\n${text || html || ''}`);
        console.log(`⚠️ SMTP credentials missing. Email content printed to log.`);
        return;
    }

    try {
        let sender = fromEmail || process.env.SMTP_FROM || process.env.EMAIL_FROM;
        if (!sender) {
            if (process.env.SMTP_USER?.includes('@')) {
                sender = process.env.SMTP_USER;
            } else if (process.env.SMTP_HOST?.includes('resend.com')) {
                sender = 'onboarding@resend.dev';
            } else {
                sender = 'noreply@citrux.in';
            }
        }

        const info = await transporter.sendMail({
            from: sender,
            to,
            subject,
            text,
            html,
        });

        await log(`✅ Email sent successfully! MessageID: ${info.messageId}`);
        await log(`Response: ${info.response}`);
        console.log(`✅ Email sent successfully! MessageID: ${info.messageId}`);
        if (process.env.SMTP_HOST?.includes('ethereal.email')) {
            console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
            await log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (error: any) {
        await log(`❌ Error sending email: ${error.message}`);
        console.error("❌ Error sending email:", error);
        throw error;
    }
};
