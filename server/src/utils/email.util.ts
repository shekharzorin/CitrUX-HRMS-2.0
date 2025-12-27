import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Utility
 * Handles sending emails using SMTP configuration from .env
 */
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const info = await transporter.sendMail({
            from: `"Citrux HRMS" <${process.env.EMAIL_FROM || 'noreply@citrux.com'}>`,
            to,
            subject,
            html
        });
        console.log('[Email] Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('[Email] Error sending email:', error);
        throw error;
    }
};

export const welcomeEmailTemplate = (name: string, email: string) => `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #4CAF50;">Welcome to Citrux HRMS!</h2>
        <p>Hi ${name},</p>
        <p>Your account has been verified. You can now log in to the HRMS portal using your email:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>Please use the password provided by your HR or use the "Forgot Password" option.</p>
        <br>
        <p>Best Regards,<br>HR Team</p>
    </div>
`;

export const leaveStatusTemplate = (name: string, status: string, startDate: string, endDate: string) => `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h3>Leave Request Update</h3>
        <p>Hi ${name},</p>
        <p>Your leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.</p>
        <br>
        <p>Best Regards,<br>HR Team</p>
    </div>
`;
