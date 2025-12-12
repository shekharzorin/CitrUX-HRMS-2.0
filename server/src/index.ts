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
import recruitmentRoutes from './routes/recruitment.routes';
import expenseRoutes from './routes/expense.routes';
import assetRoutes from './routes/asset.routes';
import profileRoutes from './routes/profile.routes';

import statsRoutes from './routes/stats.routes';
import path from 'path';

dotenv.config();

import { prisma } from './db';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
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
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/profile', profileRoutes);

app.use('/api/stats', statsRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


