import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding Citrux HRMS V2.0 Data...');

    // --- CLEANUP ---
    try {
        console.log('Breaking Manager Links...');
        // @ts-ignore
        await prisma.user.updateMany({ data: { managerId: null } });
    } catch (e: any) {
        console.log('Manager Clean Warning:', e.message);
    }

    const tables = ['notification', 'certificate', 'payslip', 'onboarding', 'jobRole', 'holiday', 'leaveRequest', 'attendance', 'leaveBalance', 'profile', 'user', 'leaveType', 'shift'];
    for (const table of tables) {
        try {
            console.log(`Purging ${table}...`);
            if ((prisma as any)[table]) {
                await (prisma as any)[table].deleteMany();
            }
        } catch (e: any) {
            console.log(`Skipping purge for ${table}: ${e.message}`);
        }
    }

    // --- SETUP ---
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    const empPasswordHash = await bcrypt.hash('user123', salt);

    // 1. Shift
    console.log('Creating Shifts...');
    const generalShift = await prisma.shift.create({
        data: {
            name: 'General Shift',
            startTime: '09:00',
            endTime: '18:00',
            graceTime: 15
        }
    });

    // 2. Leave Types
    console.log('Creating Leave Types...');
    const leaveTypesData = [
        { name: 'Casual Leave', code: 'cl', days: 12 },
        { name: 'Sick Leave', code: 'sl', days: 10 },
        { name: 'Privilege Leave', code: 'pl', days: 15 },
        { name: 'Work From Home', code: 'wfh', days: 24 }
    ];
    const leaveTypes: any = {};
    for (const t of leaveTypesData) {
        const lt = await prisma.leaveType.create({
            data: { name: t.name, code: t.code, daysPerYear: t.days }
        });
        leaveTypes[t.code] = lt;
    }

    // 3. Holidays (2024-2025 samples)
    console.log('Creating Holidays...');
    await prisma.holiday.createMany({
        data: [
            { name: 'New Year', date: new Date('2025-01-01'), type: 'National' },
            { name: 'Republic Day', date: new Date('2025-01-26'), type: 'National' },
            { name: 'Holi', date: new Date('2025-03-25'), type: 'Festival' },
            { name: 'Independence Day', date: new Date('2025-08-15'), type: 'National' },
            { name: 'Gandhi Jayanti', date: new Date('2025-10-02'), type: 'National' },
            { name: 'Diwali', date: new Date('2025-11-12'), type: 'Festival' },
            { name: 'Christmas', date: new Date('2025-12-25'), type: 'Festival' }
        ]
    });

    // 4. Job Roles
    console.log('Creating Job Roles...');
    const roles = [
        { title: 'CEO', department: 'Management', level: 10 },
        { title: 'HR Manager', department: 'HR', level: 7 },
        { title: 'Engineering Manager', department: 'Engineering', level: 8 },
        { title: 'Senior Developer', department: 'Engineering', level: 6 },
        { title: 'Software Engineer', department: 'Engineering', level: 4 },
        { title: 'Product Designer', department: 'Design', level: 5 },
        { title: 'Marketing Specialist', department: 'Marketing', level: 4 }
    ];
    for (const r of roles) {
        await prisma.jobRole.create({ data: r });
    }

    // 5. Users & Profiles
    console.log('Creating Users...');

    // --- ADMIN ---
    const admin = await prisma.user.create({
        data: {
            email: 'admin@citrux.com',
            passwordHash,
            role: 'ADMIN',
            employeeId: 'EMP001',
            shiftId: generalShift.id,
            profile: {
                create: {
                    firstName: 'Super',
                    lastName: 'Admin',
                    designation: 'CEO',
                    department: 'Management',
                    dateOfJoining: subDays(new Date(), 365 * 2)
                }
            }
        }
    });

    // --- HR MANAGER ---
    const hrManager = await prisma.user.create({
        data: {
            email: 'hr@citrux.com',
            passwordHash: empPasswordHash,
            role: 'HR',
            employeeId: 'EMP002',
            shiftId: generalShift.id,
            managerId: admin.id,
            profile: {
                create: {
                    firstName: 'Sarah',
                    lastName: 'Connor',
                    designation: 'HR Manager',
                    department: 'HR',
                    dateOfJoining: subDays(new Date(), 300)
                }
            }
        }
    });

    // --- ENG MANAGER ---
    const engManager = await prisma.user.create({
        data: {
            email: 'techlead@citrux.com',
            passwordHash: empPasswordHash,
            role: 'MANAGER',
            employeeId: 'EMP003',
            shiftId: generalShift.id,
            managerId: admin.id,
            profile: {
                create: {
                    firstName: 'John',
                    lastName: 'Doe',
                    designation: 'Engineering Manager',
                    department: 'Engineering',
                    dateOfJoining: subDays(new Date(), 400)
                }
            }
        }
    });

    // --- EMPLOYEES ---
    const employeesData = [
        { first: 'Alice', last: 'Wonder', email: 'alice@citrux.com', desig: 'Senior Developer', dept: 'Engineering', mgr: engManager.id },
        { first: 'Bob', last: 'Builder', email: 'bob@citrux.com', desig: 'Software Engineer', dept: 'Engineering', mgr: engManager.id },
        { first: 'Charlie', last: 'Chaplin', email: 'charlie@citrux.com', desig: 'Product Designer', dept: 'Design', mgr: engManager.id },
        { first: 'David', last: 'Beckham', email: 'david@citrux.com', desig: 'Marketing Specialist', dept: 'Marketing', mgr: hrManager.id }, // Reporting to HR for demo
    ];

    const allUsers = [admin, hrManager, engManager];

    for (let i = 0; i < employeesData.length; i++) {
        const e = employeesData[i];
        const user = await prisma.user.create({
            data: {
                email: e.email,
                passwordHash: empPasswordHash,
                role: 'EMPLOYEE',
                employeeId: `EMP00${i + 4}`,
                shiftId: generalShift.id,
                managerId: e.mgr,
                profile: {
                    create: {
                        firstName: e.first,
                        lastName: e.last,
                        designation: e.desig,
                        department: e.dept,
                        dateOfJoining: subDays(new Date(), 100 + i * 20),
                        phone: '9876543210'
                    }
                }
            }
        });
        allUsers.push(user);
    }

    // 6. Leave Balances & Attendance
    console.log('Generating Balances & Attendance...');

    // Last 10 days including today
    const attendanceDates = eachDayOfInterval({
        start: subDays(new Date(), 9),
        end: new Date()
    });

    for (const user of allUsers) {
        // Balances
        for (const typeCode of Object.keys(leaveTypes)) {
            await prisma.leaveBalance.create({
                data: {
                    userId: user.id,
                    leaveTypeId: leaveTypes[typeCode].id,
                    balance: leaveTypes[typeCode].daysPerYear,
                    used: 0
                }
            });
        }

        // Attendance
        for (const date of attendanceDates) {
            if (isWeekend(date)) continue; // Skip weekends

            // Randomize: 80% Present on time, 10% Late, 5% Absent, 5% Half Day
            const rand = Math.random();
            let status = 'PRESENT';
            let checkIn = new Date(date);
            checkIn.setHours(9, 0, 0, 0); // 9:00 AM
            let checkOut = new Date(date);
            checkOut.setHours(18, 0, 0, 0); // 6:00 PM
            let isLate = false;

            if (rand > 0.95) {
                // Absent - No record or stored as ABSENT
                await prisma.attendance.create({
                    data: { userId: user.id, date: date, status: 'ABSENT', shiftId: generalShift.id }
                });
                continue;
            } else if (rand > 0.9) {
                // Half Day
                status = 'HALF_DAY';
                checkOut.setHours(13, 0, 0); // Leave at 1 PM
            } else if (rand > 0.8) {
                // Late
                isLate = true;
                checkIn.setMinutes(45); // 9:45 AM
            } else {
                // On time (add random minutes variation)
                const variance = Math.floor(Math.random() * 15); // 0-14 mins
                checkIn.setMinutes(variance > 10 ? -variance : variance); // Sometimes early, sometimes few mins late but within grace
            }

            // Calculate hours
            const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

            await prisma.attendance.create({
                data: {
                    userId: user.id,
                    date: date,
                    checkIn,
                    checkOut,
                    status,
                    isLate,
                    hours,
                    shiftId: generalShift.id
                }
            });
        }
    }

    // 7. Sample Leave Requests
    console.log('Creating Leave Requests...');
    // Alice requests Sick Leave (Approved)
    await prisma.leaveRequest.create({
        data: {
            userId: allUsers[3].id, // Alice
            leaveTypeId: leaveTypes['sl'].id,
            startDate: subDays(new Date(), 5),
            endDate: subDays(new Date(), 5),
            days: 1,
            reason: 'Viral Fever',
            status: 'APPROVED',
            managerComment: 'Take care',
        }
    });

    // Bob requests Casual Leave (Pending)
    await prisma.leaveRequest.create({
        data: {
            userId: allUsers[4].id, // Bob
            leaveTypeId: leaveTypes['cl'].id,
            startDate: addDays(new Date(), 2),
            endDate: addDays(new Date(), 4),
            days: 3,
            reason: 'Family Function',
            status: 'PENDING'
        }
    });

    console.log('✅ Seeding Complete!');
    console.log('------------------------------------------------');
    console.log('Admin:       admin@citrux.com / admin123');
    console.log('HR:          hr@citrux.com    / user123');
    console.log('Manager:     techlead@citrux.com / user123');
    console.log('Employee:    alice@citrux.com / user123');
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
