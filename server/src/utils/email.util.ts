import dotenv from 'dotenv';
import { sendEmail as serviceSendEmail } from './email.service';

dotenv.config();

/**
 * Email Utility
 * Handles sending emails using SMTP configuration from .env
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        await serviceSendEmail(to, subject, undefined, html);
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

export const newLeaveRequestTemplate = (requesterName: string, type: string, days: number, startDate: string, endDate: string, reason: string) => `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h3 style="color: #2196F3;">New Leave Request</h3>
        <p><strong>Employee:</strong> ${requesterName}</p>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Duration:</strong> ${startDate} to ${endDate} (${days} days)</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <br>
        <p>Please log in to the HRMS portal to approve or reject this request.</p>
        <br>
        <p>Best Regards,<br>Citrux HRMS System</p>
    </div>
`;

export const escalationTemplate = (requesterName: string, days: number, reason: string, level: string) => `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ff9800; border-radius: 5px; background-color: #fff3e0;">
        <h3 style="color: #e65100;">Action Required: Escalated Leave Request</h3>
        <p><strong>Escalation Level:</strong> ${level}</p>
        <p>The following leave request has been pending for over 3 days and requires your immediate attention.</p>
        <hr style="border: 0; border-top: 1px solid #ffcc80;">
        <p><strong>Employee:</strong> ${requesterName}</p>
        <p><strong>Duration:</strong> ${days} days</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <br>
        <p>Please log in to the HRMS portal to review this request.</p>
        <br>
        <p>Best Regards,<br>Citrux HRMS Automations</p>
    </div>
`;
