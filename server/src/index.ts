import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import onboardingRoutes from './routes/onboarding.routes';
import payslipRoutes from './routes/payslip.routes';
import certificateRoutes from './routes/certificate.routes';
import notificationRoutes from './routes/notification.routes';
import leaveRoutes from './routes/leave.routes';
import shiftRoutes from './routes/shift.routes';
import reportsRoutes from './routes/reports.routes';

import offboardingRoutes from './routes/offboarding.routes';
import performanceRoutes from './routes/performance.routes';
// import profileRoutes from './routes/profile.routes';
import statsRoutes from './routes/stats.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import expenseRoutes from './routes/expense.routes';
import assetRoutes from './routes/asset.routes';
import profileRoutes from './routes/profile.routes';
import jobRoleRoutes from './routes/jobrole.routes';
import settingsRoutes from './routes/settings.routes';
import timesheetRoutes from './routes/timesheet.routes';
import holidayRoutes from './routes/holiday.routes';
import importRoutes from './routes/import.routes';
import documentRoutes from './routes/document.routes';
import payrollRoutes from './routes/payroll.routes';
import healthRoutes from './routes/health.routes';

import path from 'path';

dotenv.config();

import { prisma } from './db';
import logger from './utils/logger';
import { initAttendanceScheduler } from './schedulers/attendance.scheduler';
import { initLeaveScheduler } from './schedulers/leave.scheduler';

const app = express();
const port = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
    logger.error(`[FATAL] Uncaught Exception: ${err.message}`, { stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise) => {
    logger.error(`[CRITICAL] Unhandled Rejection: ${reason instanceof Error ? reason.message : JSON.stringify(reason)}`, { stack: reason instanceof Error ? reason.stack : undefined });
    // Do not crash the server on unhandled rejection, just log it. 
    // This prevents "Failed to fetch" on client when Cloudinary errors occur.
});

// Initialize Schedulers
// initAttendanceScheduler();
// initLeaveScheduler();

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logging Middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// SECURITY: Helmet & Rate Limit
app.use(helmet());

// Rate Limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // DISABLED PUBLIC ACCESS

// Secure Uploads Access
import { authenticateToken } from './middlewares/auth.middleware';
app.use('/uploads/:filename', (req, res, next) => {
    // Check if it's a profile photo (allow public access or use token?)
    // For strict security, require token. 
    // If frontend image tags don't send headers, they will break.
    // OPTION: Allow public access to 'public' folder, restrict others?
    // Current requirement: "Disable Public Access".
    // Frontend Update: Images need to be fetched via blob or authenticated token? 
    // Browsers' <img src="..."> don't easily send Auth headers. 
    // COMPROMISE: We will check for a query param token OR cookie if strict.
    // For now, let's keep it simple: If request comes from our App (Referer?) - unreliable.
    // Better: Use a short-lived signed URL or just authenticateToken key in query string?

    // User requested "Secure Documents". 
    // Let's implement a middleware that checks for 'token' in query string for <img> tags
    // OR standard header for API calls.

    // TEMPORARY: Allow if query param ?token=... is present
    if (req.query.token) {
        req.headers['authorization'] = `Bearer ${req.query.token}`;
    }
    next();
}, authenticateToken, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    res.sendFile(filePath, (err) => {
        if (err) res.status(404).json({ message: 'File not found' });
    });
});

app.get('/', (req, res) => {
    res.send('Citrux HRMS API is running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/shifts', shiftRoutes);

app.use('/api/offboarding', offboardingRoutes);
app.use('/api/performance', performanceRoutes);
// app.use('/api/profile', profileRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/job-roles', jobRoleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/holidays', holidayRoutes);

app.use('/api/stats', statsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/health', healthRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error(`[Global Error Handler] ${err.message}`, { stack: err.stack, path: req.path, method: req.method });
    res.status(500).json({ message: 'Internal Server Error', error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message });
});


app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});
