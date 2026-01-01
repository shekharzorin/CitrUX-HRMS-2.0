import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, format } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Rich Data Seeding for Citrux HRMS...');

    // --- CLEANUP ---
    const tables = [
        'notification', 'certificate', 'payslip', 'onboardingDocument', 'onboardingEmergencyContact',
        'onboardingExperience', 'onboardingEducation', 'onboarding', 'holiday', 'jobApplication', 'jobPosting',
        'expenseClaim', 'expenseCategory', 'goal', 'performanceReview', 'asset', 'break', 'attendance',
        'leaveRequest', 'leaveBalance', 'profile', 'user', 'leaveType', 'shift', 'jobRole', 'systemSetting'
    ];

    console.log('🧹 Cleaning up database...');
    // Special handling for self-referencing User managerId
    await prisma.user.updateMany({ data: { managerId: null } });

    for (const table of tables) {
        try {
            if ((prisma as any)[table]) {
                await (prisma as any)[table].deleteMany();
            }
        } catch (e: any) {
            console.log(`⚠️ Skip purge for ${table}: ${e.message}`);
        }
    }

    // --- SHARED DATA ---
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    const userPasswordHash = await bcrypt.hash('user123', salt);

    // 1. Shifts
    console.log('📅 Creating Shifts...');
    const generalShift = await prisma.shift.create({
        data: { name: 'General Shift', startTime: '09:00', endTime: '18:00', graceTime: 15 }
    });
    const nightShift = await prisma.shift.create({
        data: { name: 'Night Shift', startTime: '22:00', endTime: '07:00', graceTime: 30 }
    });

    // 2. Leave Types
    console.log('🏖️ Creating Leave Types...');
    const leaveTypes = {
        cl: await prisma.leaveType.create({ data: { name: 'Casual Leave', code: 'cl', daysPerYear: 12 } }),
        sl: await prisma.leaveType.create({ data: { name: 'Sick Leave', code: 'sl', daysPerYear: 10 } }),
        pl: await prisma.leaveType.create({ data: { name: 'Privilege Leave', code: 'pl', daysPerYear: 15 } }),
        wfh: await prisma.leaveType.create({ data: { name: 'Work From Home', code: 'wfh', daysPerYear: 30 } }),
    };

    // 3. Expense Categories
    console.log('💸 Creating Expense Categories...');
    const expenseCats = {
        travel: await prisma.expenseCategory.create({ data: { name: 'Travel', limit: 5000 } }),
        meals: await prisma.expenseCategory.create({ data: { name: 'Meals', limit: 1000 } }),
        internet: await prisma.expenseCategory.create({ data: { name: 'Internet', limit: 1500 } }),
        office: await prisma.expenseCategory.create({ data: { name: 'Office Supplies', limit: 2000 } }),
    };

    // 4. Job Roles
    console.log('💼 Creating Job Roles...');
    const jobRoles = [
        { title: 'Chief Architect', department: 'Engineering', level: 9 },
        { title: 'HR Manager', department: 'HR', level: 7 },
        { title: 'Senior Full Stack Developer', department: 'Engineering', level: 6 },
        { title: 'UI/UX Designer', department: 'Design', level: 5 },
        { title: 'Financial Analyst', department: 'Finance', level: 5 },
    ];
    for (const role of jobRoles) {
        await prisma.jobRole.create({ data: role });
    }

    // 5. USERS - Admin, HR, Manager, Employees
    console.log('👥 Creating Users & Profiles...');

    // --- ADMIN ---
    const admin = await prisma.user.create({
        data: {
            email: 'admin@citrux.com',
            passwordHash,
            role: 'ADMIN',
            employeeId: 'ADM001',
            shiftId: generalShift.id,
            profile: {
                create: {
                    firstName: 'Vikram', lastName: 'Malhotra', designation: 'CEO', department: 'Management',
                    dateOfJoining: subDays(new Date(), 730), phone: '9000010001'
                }
            }
        }
    });

    // --- HR ---
    const hr = await prisma.user.create({
        data: {
            email: 'hr@citrux.com',
            passwordHash: userPasswordHash,
            role: 'HR',
            employeeId: 'HR001',
            shiftId: generalShift.id,
            managerId: admin.id,
            profile: {
                create: {
                    firstName: 'Ananya', lastName: 'Sharma', designation: 'HR Manager', department: 'HR',
                    dateOfJoining: subDays(new Date(), 400), phone: '9000010002'
                }
            }
        }
    });

    // --- MANAGER ---
    const manager = await prisma.user.create({
        data: {
            email: 'manager@citrux.com',
            passwordHash: userPasswordHash,
            role: 'MANAGER',
            employeeId: 'MGR001',
            shiftId: generalShift.id,
            managerId: admin.id,
            profile: {
                create: {
                    firstName: 'Rahul', lastName: 'Verma', designation: 'Engineering Manager', department: 'Engineering',
                    dateOfJoining: subDays(new Date(), 500), phone: '9000010003'
                }
            }
        }
    });

    // --- EMPLOYEES ---
    const employeesData = [
        { first: 'Siddharth', last: 'Gupta', email: 'sid@citrux.com', desig: 'Senior Full Stack Developer', dept: 'Engineering', eid: 'EMP001' },
        { first: 'Priyanka', last: 'Chopra', email: 'priyanka@citrux.com', desig: 'UI/UX Designer', dept: 'Design', eid: 'EMP002' },
        { first: 'Ishaan', last: 'Khattar', email: 'ishaan@citrux.com', desig: 'Software Engineer', dept: 'Engineering', eid: 'EMP003' },
        { first: 'Deepika', last: 'Padukone', email: 'deepika@citrux.com', desig: 'Financial Analyst', dept: 'Finance', eid: 'EMP004' },
    ];

    const employees: any[] = [];
    for (const e of employeesData) {
        const user = await prisma.user.create({
            data: {
                email: e.email,
                passwordHash: userPasswordHash,
                role: 'EMPLOYEE',
                employeeId: e.eid,
                shiftId: generalShift.id,
                managerId: manager.id,
                profile: {
                    create: {
                        firstName: e.first, lastName: e.last, designation: e.desig, department: e.dept,
                        dateOfJoining: subDays(new Date(), 200), phone: '90000' + Math.floor(10000 + Math.random() * 90000)
                    }
                }
            }
        });
        employees.push(user);
    }

    const allUsers = [admin, hr, manager, ...employees];

    // 6. ATTENDANCE & BREAKS (Last 20 days)
    console.log('⏰ Generating Attendance & Breaks...');
    const dateRange = eachDayOfInterval({ start: subDays(new Date(), 19), end: new Date() });

    for (const user of allUsers) {
        for (const date of dateRange) {
            if (isWeekend(date)) continue;

            const rand = Math.random();
            if (rand < 0.05) continue; // 5% chance of being absent (no record)

            const checkIn = new Date(date);
            checkIn.setHours(9, Math.floor(Math.random() * 30), 0); // 9:00 - 9:30 AM
            const isLate = checkIn.getHours() === 9 && checkIn.getMinutes() > 15;

            const checkOut = new Date(date);
            checkOut.setHours(18, Math.floor(Math.random() * 60), 0); // 6:00 - 7:00 PM

            const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

            const att = await prisma.attendance.create({
                data: {
                    userId: user.id, date, checkIn, checkOut, status: 'PRESENT', isLate, hours, shiftId: generalShift.id
                }
            });

            // Add 1-2 breaks for some records
            if (Math.random() > 0.3) {
                const breakStart = new Date(date);
                breakStart.setHours(13, 0, 0);
                const breakEnd = new Date(date);
                breakEnd.setHours(13, 45 + Math.floor(Math.random() * 30), 0);
                await prisma.break.create({
                    data: {
                        attendanceId: att.id,
                        startTime: breakStart,
                        endTime: breakEnd,
                        duration: (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
                    }
                });
            }
        }
    }

    // 7. LEAVE BALANCES & REQUESTS
    console.log('🌴 Generating Leave Data...');
    for (const user of allUsers) {
        for (const lt of Object.values(leaveTypes)) {
            await prisma.leaveBalance.create({
                data: { userId: user.id, leaveTypeId: lt.id, balance: lt.daysPerYear - (Math.floor(Math.random() * 5)), used: Math.floor(Math.random() * 5) }
            });
        }
    }

    // Sample Requests
    await prisma.leaveRequest.createMany({
        data: [
            { userId: employees[0].id, leaveTypeId: leaveTypes.cl.id, startDate: subDays(new Date(), 10), endDate: subDays(new Date(), 9), days: 2, reason: 'Personal work', status: 'APPROVED' },
            { userId: employees[1].id, leaveTypeId: leaveTypes.sl.id, startDate: subDays(new Date(), 2), endDate: subDays(new Date(), 1), days: 2, reason: 'Fever', status: 'APPROVED' },
            { userId: employees[2].id, leaveTypeId: leaveTypes.pl.id, startDate: addDays(new Date(), 5), endDate: addDays(new Date(), 10), days: 6, reason: 'Family vacation', status: 'PENDING' },
            { userId: manager.id, leaveTypeId: leaveTypes.cl.id, startDate: addDays(new Date(), 1), endDate: addDays(new Date(), 1), days: 1, reason: 'Bank work', status: 'PENDING' },
        ]
    });

    // 8. NOTIFICATIONS
    console.log('🔔 Creating Sample Notifications...');
    const notifyTemplates = [
        "Welcome to Citrux HRMS! Complete your profile to get started.",
        "Your leave request for Casual Leave has been approved.",
        "System maintenance scheduled for Sunday, 2 AM IST.",
        "Reminder: Please submit your timesheet for the current week.",
        "Holiday Reminder: Independence Day is coming up next Friday.",
        "Your payslip for the month of November has been generated.",
    ];

    for (const user of allUsers) {
        const count = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            await prisma.notification.create({
                data: { userId: user.id, message: notifyTemplates[i % notifyTemplates.length], read: Math.random() > 0.5, createdAt: subDays(new Date(), i) }
            });
        }
    }

    // 9. PAYSLIPS (Last 3 months)
    console.log('💳 Generating Payslips...');
    const months = [10, 11, 12];
    for (const user of allUsers) {
        for (const month of months) {
            const gross = 50000 + (Math.floor(Math.random() * 50) * 1000);
            const deductions = gross * 0.1;
            const net = gross - deductions;
            await prisma.payslip.create({
                data: {
                    userId: user.id, month, year: 2025, gross, net,
                    details: JSON.stringify({ basic: gross * 0.5, hra: gross * 0.3, lta: gross * 0.1, others: gross * 0.1, pf: deductions * 0.6, tax: deductions * 0.4 }),
                    generatedAt: new Date(2025, month - 1, 30)
                }
            });
        }
    }

    // 10. EXPENSE CLAIMS
    console.log('🧾 Creating Expense Claims...');
    await prisma.expenseClaim.createMany({
        data: [
            { userId: employees[0].id, categoryId: expenseCats.travel.id, amount: 1200, description: 'Client meeting taxi', status: 'APPROVED', date: subDays(new Date(), 15) },
            { userId: employees[1].id, categoryId: expenseCats.internet.id, amount: 999, description: 'Home broadband', status: 'PENDING', date: subDays(new Date(), 5) },
            { userId: manager.id, categoryId: expenseCats.office.id, amount: 2500, description: 'New whiteboard for team', status: 'REJECTED', date: subDays(new Date(), 20) },
        ]
    });

    // 11. ASSETS
    console.log('💻 Registering Assets...');
    await prisma.asset.createMany({
        data: [
            { name: 'MacBook Pro M3', type: 'Laptop', serialNumber: 'MBP-2024-001', status: 'ASSIGNED', assignedTo: employees[0].id },
            { name: 'Dell UltraSharp 27', type: 'Monitor', serialNumber: 'DEL-MON-778', status: 'ASSIGNED', assignedTo: employees[0].id },
            { name: 'Logitech MX Master 3', type: 'Peripherals', serialNumber: 'LOG-MS-991', status: 'AVAILABLE' },
            { name: 'iPhone 15 Pro', type: 'Mobile', serialNumber: 'IPH-133-909', status: 'ASSIGNED', assignedTo: manager.id },
        ]
    });

    // 12. PERFORMANCE - Goals & Reviews
    console.log('📈 Setting Performance Data...');
    for (const user of employees) {
        await prisma.goal.create({
            data: { userId: user.id, title: 'Complete Project Orion', description: 'Deliver all modules of Orion by quarter end', deadline: addDays(new Date(), 30), status: 'IN_PROGRESS' }
        });
        await prisma.performanceReview.create({
            data: { userId: user.id, reviewerId: manager.id, period: 'Q3 2025', rating: 4, feedback: 'Excellent technical skills and strong team player.' }
        });
    }

    // 13. RECRUITMENT
    console.log('🔍 Creating Job Postings...');
    const job = await prisma.jobPosting.create({
        data: { title: 'Senior React Developer', department: 'Engineering', description: 'Strong knowledge of React and Typescript required.', status: 'OPEN' }
    });
    await prisma.jobApplication.create({
        data: { jobId: job.id, applicantName: 'Karan Mehra', email: 'karan@gmail.com', phone: '9988776655', status: 'INTERVIEWING' }
    });

    // 14. HOLIDAYS 2025
    console.log('🗓️ Adding Holidays...');
    await prisma.holiday.createMany({
        data: [
            { name: 'Republic Day', date: new Date('2025-01-26'), type: 'National' },
            { name: 'Maha Shivratri', date: new Date('2025-02-26'), type: 'Gazetted' },
            { name: 'Holi', date: new Date('2025-03-14'), type: 'Festival' },
            { name: 'Eid al-Fitr', date: new Date('2025-03-31'), type: 'Gazetted' },
            { name: 'Independence Day', date: new Date('2025-08-15'), type: 'National' },
            { name: 'Diwali', date: new Date('2025-10-21'), type: 'Festival' },
            { name: 'Christmas', date: new Date('2025-12-25'), type: 'National' },
        ]
    });

    console.log('🏁 Rich Seeding Completed!');
    console.log(`
    Credentials:
    - Admin: admin@citrux.com / admin123
    - HR:    hr@citrux.com    / user123
    - Manager: manager@citrux.com / user123
    - Employee: sid@citrux.com / user123
    `);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
