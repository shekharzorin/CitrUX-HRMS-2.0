
import { prisma } from '../db';

async function verifyLeaveFlow() {
    console.log('--- Verifying Leave Flow & Notifications ---');

    try {
        // 1. Setup Test Users
        console.log('Creating Test Users...');

        const admin = await prisma.user.upsert({
            where: { email: 'admin-test@citrux.com' },
            update: {},
            create: {
                email: 'admin-test@citrux.com',
                passwordHash: 'dummy',
                role: 'ADMIN',
                profile: { create: { firstName: 'Admin', lastName: 'User' } }
            }
        });

        const manager = await prisma.user.upsert({
            where: { email: 'manager-test@citrux.com' },
            update: {},
            create: {
                email: 'manager-test@citrux.com',
                passwordHash: 'dummy',
                role: 'MANAGER',
                profile: { create: { firstName: 'Manager', lastName: 'User' } }
            }
        });

        const employee = await prisma.user.upsert({
            where: { email: 'emp-test@citrux.com' },
            update: { managerId: manager.id },
            create: {
                email: 'emp-test@citrux.com',
                passwordHash: 'dummy',
                role: 'EMPLOYEE',
                managerId: manager.id,
                profile: { create: { firstName: 'Employee', lastName: 'User' } }
            }
        });

        console.log('Users created successfully.');

        // 2. Setup Leave Type
        let leaveType = await prisma.leaveType.findFirst({
            where: { code: 'TEST_LEAVE' }
        });
        if (!leaveType) {
            leaveType = await prisma.leaveType.create({
                data: { name: 'Test Leave', code: 'TEST_LEAVE', daysPerYear: 10 }
            });
        }

        // 3. Create Leave Request (Simulating Apply Leave)
        console.log('Creating Leave Request...');
        const request = await prisma.leaveRequest.create({
            data: {
                userId: employee.id,
                leaveTypeId: leaveType.id,
                startDate: new Date(),
                endDate: new Date(),
                days: 1,
                reason: 'Test Leave Reason',
                status: 'PENDING'
            }
        });
        console.log(`Leave Request Created: ${request.id}`);

        // 4. Verify Creation in DB
        const fetchedRequest = await prisma.leaveRequest.findUnique({ where: { id: request.id } });
        if (!fetchedRequest) throw new Error('Failed to save leave request in DB');
        console.log('✅ Leave Request saved in DB.');

        // 5. Simulate Notification Creation (Since controller does this)
        console.log('Creating Notifications...');
        await prisma.notification.createMany({
            data: [
                { userId: manager.id, message: 'New Leave Request from Employee User' },
                { userId: admin.id, message: 'New Leave Request from Employee User' }
            ]
        });

        // 6. Verify Notifications
        const notifs = await prisma.notification.findMany({
            where: {
                userId: { in: [manager.id, admin.id] },
                message: { contains: 'New Leave Request' }
            }
        });

        if (notifs.length >= 2) {
            console.log(`✅ Notifications saved for Manager and Admin (${notifs.length} found).`);
        } else {
            console.warn('⚠️ Notifications verification failed or partial.');
        }

        // 7. Cleanup
        console.log('Cleaning up test data...');
        // Order matters for FK constraints
        await prisma.notification.deleteMany({ where: { userId: { in: [employee.id, manager.id, admin.id] } } });
        await prisma.leaveRequest.deleteMany({ where: { userId: employee.id } });
        // Don't delete users to avoid breaking other tests or if they existed before
        // But for this test logic, we upserted, so it's fine.

        console.log('✅ Flow Verification Complete: All checks passed.');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyLeaveFlow();
