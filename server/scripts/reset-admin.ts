
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetAdmin() {
    try {
        const email = 'admin@citrux.com';
        const newPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const user = await prisma.user.update({
            where: { email },
            data: { passwordHash }
        });

        console.log(`Password for ${email} has been reset to ${newPassword}`);
    } catch (error) {
        console.error('Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAdmin();
