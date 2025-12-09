import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Start seeding Citrux HRMS V2.0 Data...');

    // Pre-clean: Break Manager hierarchy to allow deletion
    try {
        console.log('Breaking Manager Links...');
        // @ts-ignore
        await prisma.user.updateMany({ data: { managerId: null } });
    } catch (e: any) {
        console.log('Manager Clean Warning:', e.message);
    }

    // Clean up
    const tables = ['notification', 'certificate', 'payslip', 'onboarding', 'attendance', 'leaveRequest', 'leaveBalance', 'profile', 'user', 'leaveType'];
    for (const table of tables) {
        try {
            console.log(`Purging ${table}...`);
            if (!(prisma as any)[table]) {
                console.error(`ERROR: Table ${table} not found in Prisma Client! Keys: ${Object.keys(prisma)}`);
                continue;
            }
            await (prisma as any)[table].deleteMany();
        } catch (e: any) {
            console.log(`Skipping purge for ${table}: ${e.message}`);
        }
    }

    // Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('admin123', salt);
    const empPasswordHash = await bcrypt.hash('user123', salt);

    // 1. Create Leave Types
    console.log('Creating Leave Types...');
    const types = [
        { name: 'Casual Leave', code: 'cl', days: 12 },
        { name: 'Sick Leave', code: 'sl', days: 10 },
        { name: 'Privilege Leave', code: 'pl', days: 15 },
        { name: 'Work From Home', code: 'wfh', days: 24 }
    ];

    const leaveTypeMap: any = {};
    for (const t of types) {
        const lt = await prisma.leaveType.create({
            data: { name: t.name, code: t.code, daysPerYear: t.days }
        });
        leaveTypeMap[t.code] = lt.id;
    }

    // 2. Create Users
    console.log('Creating Users...');

    // Admin
    const admin = await prisma.user.create({
        data: {
            email: 'admin@citrux.com',
            passwordHash,
            role: 'ADMIN',
            profile: {
                create: { firstName: 'Super', lastName: 'Admin', designation: 'CEO', department: 'Management', dateOfJoining: new Date() }
            }
        }
    });

    // HR
    const hr = await prisma.user.create({
        data: {
            email: 'hr@citrux.com',
            passwordHash: empPasswordHash,
            role: 'HR',
            managerId: admin.id,
            profile: {
                create: { firstName: 'Sarah', lastName: 'Connor', designation: 'HR Manager', department: 'HR', dateOfJoining: new Date() }
            }
        }
    });

    // Manager
    const manager = await prisma.user.create({
        data: {
            email: 'manager@citrux.com',
            passwordHash: empPasswordHash,
            role: 'EMPLOYEE',
            managerId: admin.id,
            profile: {
                create: { firstName: 'John', lastName: 'Doe', designation: 'Engineering Manager', department: 'Engineering', dateOfJoining: new Date() }
            }
        }
    });

    // Employees
    const emp1 = await prisma.user.create({
        data: {
            email: 'alice@citrux.com',
            passwordHash: empPasswordHash,
            role: 'EMPLOYEE',
            managerId: manager.id,
            profile: {
                create: { firstName: 'Alice', lastName: 'Smith', designation: 'Senior Dev', department: 'Engineering', dateOfJoining: new Date() }
            }
        }
    });

    const emp2 = await prisma.user.create({
        data: {
            email: 'bob@citrux.com',
            passwordHash: empPasswordHash,
            role: 'EMPLOYEE',
            managerId: manager.id,
            profile: {
                create: { firstName: 'Bob', lastName: 'Jones', designation: 'UI Designer', department: 'Design', dateOfJoining: new Date() }
            }
        }
    });

    // Intern
    const intern = await prisma.user.create({
        data: {
            email: 'intern@citrux.com',
            passwordHash: empPasswordHash,
            role: 'INTERN',
            managerId: emp1.id, // Reports to Alice
            profile: {
                create: { firstName: 'Charlie', lastName: 'Brown', designation: 'Intern', department: 'Engineering', employmentType: 'INTERN', dateOfJoining: new Date() }
            }
        }
    });

    const allUsers = [admin, hr, manager, emp1, emp2, intern];

    // 3. Assign Leave Balances
    console.log('Assigning Leave Balances...');
    for (const u of allUsers) {
        for (const code in leaveTypeMap) {
            await prisma.leaveBalance.create({
                data: {
                    userId: u.id,
                    leaveTypeId: leaveTypeMap[code],
                    balance: types.find(t => t.code === code)?.days || 0,
                    used: 0
                }
            });
        }
    }

    // 4. Create Attendance (Random)
    console.log('Creating Attendance logs...');
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        for (const u of allUsers) {
            // Random absent
            if (Math.random() > 0.9) continue;

            const inTime = new Date(date);
            inTime.setHours(9 + Math.random(), Math.random() * 59, 0);
            const outTime = new Date(date);
            outTime.setHours(18 + Math.random(), Math.random() * 59, 0);

            const hours = (outTime.getTime() - inTime.getTime()) / (1000 * 3600);

            await prisma.attendance.create({
                data: {
                    userId: u.id,
                    date: date,
                    checkIn: inTime,
                    checkOut: outTime,
                    hours: parseFloat(hours.toFixed(2)),
                    status: 'PRESENT'
                }
            });
        }
    }

    console.log('✅ Seeding Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
