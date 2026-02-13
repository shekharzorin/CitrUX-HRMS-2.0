
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
    const email = 'user@citrux.com';
    const password = 'user123';

    console.log(`Creating test user ${email}...`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { passwordHash, role: 'EMPLOYEE' },
            create: {
                email,
                passwordHash,
                role: 'EMPLOYEE',
                profile: {
                    create: { firstName: 'Test', lastName: 'User', designation: 'Developer', department: 'Engineering', dateOfJoining: new Date() }
                }
            }
        });
        console.log(`✅ Success! User: ${user.email}, Password: ${password}`);
    } catch (e) {
        console.error('Error creating user:', e);
    }
}

createTestUser()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
