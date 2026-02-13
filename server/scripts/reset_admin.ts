
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function reset() {
    const email = 'admin@citrux.com';
    const password = 'admin123';

    console.log(`Resetting password for ${email}...`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { passwordHash },
            create: {
                email,
                passwordHash,
                role: 'ADMIN',
                profile: {
                    create: { firstName: 'Super', lastName: 'Admin', designation: 'CEO', department: 'Management', dateOfJoining: new Date() }
                }
            }
        });
        console.log(`✅ Success! User: ${user.email}, Password: ${password}`);
    } catch (e) {
        console.error('Error resetting password:', e);
    }
}

reset()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
