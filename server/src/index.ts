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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
