import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import salaryRoutes from './routes/salary.routes';
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

import path from 'path';

dotenv.config();

import { prisma } from './db';
import { initAttendanceScheduler } from './schedulers/attendance.scheduler';
import { initLeaveScheduler } from './schedulers/leave.scheduler';

const app = express();
const port = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Initialize Schedulers
// initAttendanceScheduler();
// initLeaveScheduler();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/salary', salaryRoutes);
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

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Global Error Handler]', err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);


});
