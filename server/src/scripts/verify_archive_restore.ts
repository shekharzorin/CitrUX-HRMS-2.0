import { prisma } from '../db';

async function verifyArchiveRestoreFlow() {
    console.log('--- Verifying Employee Archiving & Restoration Flow ---');

    try {
        // 1. Create a dummy company or find an existing one to scope under
        const company = await prisma.company.findFirst();
        if (!company) {
            throw new Error('No company found in database to run tests against.');
        }
        const companyId = company.id;
        console.log(`Using company: ${company.name} (${companyId})`);

        // 2. Setup Test Manager and Employee
        console.log('Creating Test Manager & Subordinate Employee...');
        const manager = await prisma.user.create({
            data: {
                email: 'manager-archive-test@citrux.com',
                passwordHash: '$2b$10$dummyhashformanager',
                role: 'MANAGER',
                companyId,
                status: 'ACTIVE',
                profile: {
                    create: {
                        firstName: 'Test',
                        lastName: 'Manager',
                        designation: 'Manager'
                    }
                }
            }
        });

        const employee = await prisma.user.create({
            data: {
                email: 'emp-archive-test@citrux.com',
                passwordHash: '$2b$10$dummyhashforemployee',
                role: 'EMPLOYEE',
                companyId,
                status: 'ACTIVE',
                managerId: manager.id,
                profile: {
                    create: {
                        firstName: 'Test',
                        lastName: 'Employee',
                        designation: 'Employee'
                    }
                }
            }
        });

        // 3. Create a test asset and assign it to the employee
        console.log('Creating Test Asset and assigning it to employee...');
        const asset = await prisma.asset.create({
            data: {
                name: 'Test Laptop',
                type: 'LAPTOP',
                serialNumber: 'TEST-LAPTOP-123',
                status: 'ASSIGNED',
                companyId,
                assignedTo: employee.id
            }
        });

        console.log('Setup completed successfully.');

        // 4. Perform the Archive (Soft Delete) Logic
        console.log('Simulating Employee Archive (Soft Delete)...');
        
        // Update subordinates
        const updateSubordinates = prisma.user.updateMany({
            where: { managerId: employee.id },
            data: { managerId: null }
        });

        // Detach Assets
        const detachAssets = prisma.asset.updateMany({
            where: { assignedTo: employee.id },
            data: { assignedTo: null, status: 'AVAILABLE' }
        });

        // Update status to ARCHIVED
        const archiveUser = prisma.user.update({
            where: { id: employee.id },
            data: { status: 'ARCHIVED' }
        });

        await prisma.$transaction([
            updateSubordinates,
            detachAssets,
            archiveUser
        ]);

        console.log('Archive transaction completed.');

        // 5. Verification checks after archiving
        const archivedUser = await prisma.user.findUnique({
            where: { id: employee.id }
        });
        if (!archivedUser || archivedUser.status !== 'ARCHIVED') {
            throw new Error('Verification failed: User status is not ARCHIVED!');
        }
        console.log('✅ Checked: User status is successfully set to ARCHIVED.');

        const updatedAsset = await prisma.asset.findUnique({
            where: { id: asset.id }
        });
        if (!updatedAsset || updatedAsset.assignedTo !== null || updatedAsset.status !== 'AVAILABLE') {
            throw new Error('Verification failed: Asset was not detached or status not set to AVAILABLE!');
        }
        console.log('✅ Checked: Asset successfully detached and set to AVAILABLE.');

        // 6. Perform the Restore Logic
        console.log('Simulating Employee Restoration...');
        const restoredUser = await prisma.user.update({
            where: { id: employee.id },
            data: { status: 'ACTIVE' }
        });
        if (restoredUser.status !== 'ACTIVE') {
            throw new Error('Verification failed: Restored user status is not ACTIVE!');
        }
        console.log('✅ Checked: User status successfully restored to ACTIVE.');

        // 7. Cleanup
        console.log('Cleaning up test data...');
        await prisma.asset.delete({ where: { id: asset.id } });
        await prisma.user.delete({ where: { id: employee.id } });
        await prisma.user.delete({ where: { id: manager.id } });
        console.log('✅ Checked: Cleanup successful.');

        console.log('🎉 All checks passed successfully!');
    } catch (error) {
        console.error('❌ Verification Failed:', error);
        // Attempt clean up anyway in case of failure
        console.log('Attempting cleanup of any created test data...');
        try {
            await prisma.asset.deleteMany({ where: { serialNumber: 'TEST-LAPTOP-123' } });
            await prisma.user.deleteMany({
                where: { email: { in: ['emp-archive-test@citrux.com', 'manager-archive-test@citrux.com'] } }
            });
        } catch (e) {
            // Ignore cleanup errors
        }
    } finally {
        await prisma.$disconnect();
    }
}

verifyArchiveRestoreFlow();
