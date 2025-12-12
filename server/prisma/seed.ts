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
    console.log('Creating Admin User...');

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

    console.log('✅ Seeding Complete! Default Admin: admin@citrux.com / admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
