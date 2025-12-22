
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function check() {
    console.log('Checking admin credentials...');
    const email = 'admin@citrux.com';
    const password = 'admin123';

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log('❌ User not found:', email);
        return;
    }
    console.log('✅ User found:', user.email);
    console.log('Stored Hash:', user.passwordHash);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (match) {
        console.log('✅ Password "admin123" is CORRECT.');
    } else {
        console.log('❌ Password "admin123" is INCORRECT.');
        // Update it to be correct
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(password, salt);
        await prisma.user.update({
            where: { email },
            data: { passwordHash: newHash }
        });
        console.log('✅ Password has been RESET to "admin123". Try logging in now.');
    }
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
