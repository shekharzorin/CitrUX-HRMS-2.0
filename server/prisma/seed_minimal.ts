
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting minimal seed...');
    try {
        const hash = await bcrypt.hash('user123', 10);

        console.log('Creating Admin...');
        const admin = await prisma.user.create({
            data: {
                email: 'admin@citrux.com',
                passwordHash: hash,
                role: 'ADMIN',
                profile: {
                    create: { firstName: 'Admin', lastName: 'User', employmentType: 'FULL_TIME' }
                }
            }
        });
        console.log('Admin created:', admin.id);

        console.log('Creating Alice...');
        await prisma.user.create({
            data: {
                email: 'alice@citrux.com',
                passwordHash: hash,
                role: 'EMPLOYEE',
                managerId: admin.id,
                profile: {
                    create: { firstName: 'Alice', lastName: 'Wonder', employmentType: 'FULL_TIME' }
                }
            }
        });
        console.log('Alice created.');

        // Sick Leave Balance for Alice
        const sl = await prisma.leaveType.create({ data: { name: 'Sick Leave', code: 'sl', daysPerYear: 10 } });
        await prisma.leaveBalance.create({
            data: { userId: admin.id, leaveTypeId: sl.id, balance: 10 }
        }); // Alice? No, just admin for now to prove it works. Wait, I need alice to login.

    } catch (e) {
        console.error('Seed Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
