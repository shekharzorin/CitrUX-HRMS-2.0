import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authorizeRole } from './middlewares/auth.middleware';

import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';
import attendanceRoutes from './routes/attendance.routes';
import onboardingRoutes from './routes/onboarding.routes';
import payslipRoutes from './routes/payslip.routes';
import certificateRoutes from './routes/certificate.routes';
import notificationRoutes from './routes/notification.routes';
import leaveRoutes from './routes/leave.routes';
import shiftRoutes from './routes/shift.routes';
import attendancePolicyRoutes from './routes/attendance-policy.routes';
import reportsRoutes from './routes/reports.routes';
import aiRoutes from './routes/ai.routes';

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
import companyRoutes from './routes/company.routes';
import worklogRoutes from './routes/worklog.routes';
import taskRoutes from './routes/task.routes';
import uploadRoutes from './routes/upload.routes';
import searchRoutes from './routes/search.routes';
import { errorHandler } from './middlewares/error.middleware';
import organizationRoutes from './routes/organization.routes';
import engagementRoutes from './routes/engagement.routes';

import path from 'path';
import { createServer } from 'http';
import { CronService } from './services/cron.service';
import { SocketService } from './services/socket.service';

dotenv.config();

import { prisma, connectDB } from './db';
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
initAttendanceScheduler();
initLeaveScheduler();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = clientUrl.includes(',') ? clientUrl.split(',') : clientUrl;

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (typeof allowedOrigins === 'string') {
            if (allowedOrigins === origin) return callback(null, true);
        } else if (Array.isArray(allowedOrigins)) {
            if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        }
        // Fallback for subdomains or similar
        if (origin.endsWith('.isnap.in') || origin.endsWith('.citrux.in')) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
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
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "https:", "*.onrender.com", "*.cloudinary.com", "cloudinary.com"],
        },
    },
}));

// Rate Limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Increased from 100 to prevent blocking normal SPA usage
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // DISABLED PUBLIC ACCESS

// Secure Uploads Access
import jwt from 'jsonwebtoken';

app.use('/uploads/:filepath(.*)', (req, res, next) => {
    const token = req.query.token as string;
    const filepath = req.params.filepath;

    if (!token) {
        return res.status(401).json({ message: 'URL signature missing' });
    }

    try {
        // Just verify they are a logged in user of the system
        jwt.verify(token, process.env.JWT_SECRET as string);
        next();
    } catch (err) {
        return res.status(403).json({ message: 'URL signature expired or invalid' });
    }
}, (req, res) => {
    const filepath = req.params.filepath;
    const fullPath = path.join(__dirname, '../uploads', filepath);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(fullPath, (err) => {
        if (err) res.status(404).json({ message: 'File not found' });
    });
});

app.get('/', (req, res) => {
    res.send('Citrux HRMS API is running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance-policy', attendancePolicyRoutes);

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
app.use('/api/ai', aiRoutes);
app.use('/api/import', importRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/engagement', engagementRoutes);

// Catch-all 404 for API routes
app.use('/api', (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
});

// Global Error Handler
app.use(errorHandler);

const server = createServer(app);

// Initialize WebSockets
SocketService.initialize(server);

server.listen(port, async () => {
    logger.info(`Server running on port ${port}`);
    await connectDB();  // Test and report DB connectivity at startup
    
    // Initialize background jobs
    CronService.start();
});
// Trigger nodemon restart
