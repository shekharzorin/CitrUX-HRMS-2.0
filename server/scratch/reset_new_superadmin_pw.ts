import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function reset() {
    const email = 'shekharzorin@gmail.com';
    const password = 'Admin@123';

    console.log(`Resetting password for ${email}...`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
        await prisma.user.update({
            where: { email },
            data: { passwordHash }
        });
        console.log(`✅ Success! ${email} password reset to: ${password}`);
    } catch (e: any) {
        console.error('❌ Failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

reset();
