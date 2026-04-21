import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🌱  Citrux HRMS — Database Seed\n');

    // ─── 1. Demo Company ──────────────────────────────────────────────────────
    const company = await prisma.company.upsert({
        where: { name: 'Citrux Technologies' },
        update: {},
        create: {
            name: 'Citrux Technologies',
            subdomain: 'citrux',
        }
    });
    console.log(`✅  Company   : ${company.name} [${company.id}]`);

    // ─── 2. Super Admin (global — no companyId) ───────────────────────────────
    const superAdminPwd = await bcrypt.hash('SuperAdmin@123', 10);
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@citrux.com' },
        update: {},
        create: {
            email: 'superadmin@citrux.com',
            passwordHash: superAdminPwd,
            role: 'SUPER_ADMIN',
            companyId: null,
            profile: {
                create: { firstName: 'Super', lastName: 'Admin' }
            }
        }
    });
    console.log(`✅  Super Admin: ${superAdmin.email}`);

    // ─── 3. Company Admin ─────────────────────────────────────────────────────
    const adminPwd = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@citrux.com' },
        update: {},
        create: {
            email: 'admin@citrux.com',
            passwordHash: adminPwd,
            role: 'ADMIN',
            companyId: company.id,
            profile: {
                create: {
                    firstName: 'Company',
                    lastName: 'Admin',
                    designation: 'HR Manager',
                    department: 'Human Resources',
                }
            }
        }
    });
    console.log(`✅  Admin     : ${admin.email}`);

    // ─── 4. Default Shift ─────────────────────────────────────────────────────
    const shift = await prisma.shift.upsert({
        where: { id: 'shift-general-default' },
        update: {},
        create: {
            id: 'shift-general-default',
            name: 'General (9 AM – 6 PM)',
            startTime: '09:00',
            endTime: '18:00',
            graceTime: 15,
        }
    });
    console.log(`✅  Shift     : ${shift.name}`);

    // ─── 5. Leave Types ───────────────────────────────────────────────────────
    const leaveTypeDefs = [
        { name: 'Annual Leave',    code: 'AL', daysPerYear: 18, carryForward: true,  maxCarryForward: 5 },
        { name: 'Sick Leave',      code: 'SL', daysPerYear: 12, carryForward: false, maxCarryForward: 0 },
        { name: 'Casual Leave',    code: 'CL', daysPerYear: 6,  carryForward: false, maxCarryForward: 0 },
        { name: 'Maternity Leave', code: 'ML', daysPerYear: 180,carryForward: false, maxCarryForward: 0 },
        { name: 'Paternity Leave', code: 'PL', daysPerYear: 15, carryForward: false, maxCarryForward: 0 },
    ];
    for (const lt of leaveTypeDefs) {
        await prisma.leaveType.upsert({
            where: { code: lt.code },
            update: {},
            create: lt
        });
    }
    const allLeaveTypes = await prisma.leaveType.findMany();
    console.log(`✅  Leave Types: ${allLeaveTypes.map(t => t.code).join(', ')}`);

    // ─── 6. Sample Manager ────────────────────────────────────────────────────
    const managerPwd = await bcrypt.hash('Manager@123', 10);
    const manager = await prisma.user.upsert({
        where: { email: 'manager@citrux.com' },
        update: {},
        create: {
            email: 'manager@citrux.com',
            employeeId: 'EMP002',
            passwordHash: managerPwd,
            role: 'MANAGER',
            companyId: company.id,
            shiftId: shift.id,
            profile: {
                create: {
                    firstName: 'Rahul',
                    lastName: 'Sharma',
                    designation: 'Engineering Manager',
                    department: 'Engineering',
                    dateOfJoining: new Date('2022-06-01'),
                    employmentType: 'FULL_TIME',
                }
            }
        }
    });
    console.log(`✅  Manager   : ${manager.email}`);

    // ─── 7. Sample Employee ───────────────────────────────────────────────────
    const empPwd = await bcrypt.hash('Employee@123', 10);
    const employee = await prisma.user.upsert({
        where: { email: 'john.doe@citrux.com' },
        update: {},
        create: {
            email: 'john.doe@citrux.com',
            employeeId: 'EMP001',
            passwordHash: empPwd,
            role: 'EMPLOYEE',
            companyId: company.id,
            shiftId: shift.id,
            managerId: manager.id,
            profile: {
                create: {
                    firstName: 'John',
                    lastName: 'Doe',
                    designation: 'Software Engineer',
                    department: 'Engineering',
                    dateOfJoining: new Date('2024-01-15'),
                    employmentType: 'FULL_TIME',
                    phone: '9876543210',
                }
            }
        }
    });
    console.log(`✅  Employee  : ${employee.email}`);

    // ─── 8. Leave Balances for all company employees ──────────────────────────
    const companyUsers = await prisma.user.findMany({
        where: { companyId: company.id }
    });

    for (const u of companyUsers) {
        for (const lt of allLeaveTypes) {
            await prisma.leaveBalance.upsert({
                where: { userId_leaveTypeId: { userId: u.id, leaveTypeId: lt.id } },
                update: {},
                create: {
                    userId: u.id,
                    leaveTypeId: lt.id,
                    balance: lt.daysPerYear,
                    used: 0,
                }
            });
        }
    }
    console.log(`✅  Leave Balances initialized for ${companyUsers.length} users`);

    // ─── 9. System Settings ───────────────────────────────────────────────────
    const settings = [
        { key: 'EMP_ID_AUTO_GENERATE', value: 'true' },
        { key: 'EMP_ID_PREFIX', value: 'EMP' },
        { key: 'EMP_ID_NEXT', value: '3' },
        { key: 'EMP_ID_PADDING', value: '3' },
    ];
    for (const s of settings) {
        await prisma.systemSetting.upsert({
            where: { key: s.key },
            update: {},
            create: s
        });
    }
    console.log(`✅  System Settings: ${settings.length} entries`);

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(52));
    console.log('🎉  Seed complete! Use these credentials to log in:\n');
    console.log('  Role          Email                       Password');
    console.log('  ─────────────────────────────────────────────────');
    console.log('  Super Admin   superadmin@citrux.com       SuperAdmin@123');
    console.log('  Admin/HR      admin@citrux.com            Admin@123');
    console.log('  Manager       manager@citrux.com          Manager@123');
    console.log('  Employee      john.doe@citrux.com         Employee@123');
    console.log('─'.repeat(52) + '\n');
}

main()
    .catch((e) => {
        console.error('❌  Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
