
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'vineethng203@gmail.com';
    console.log('Force updating role for:', email);

    try {
        const updated = await prisma.user.update({
            where: { email },
            data: { role: 'HR' }
        });
        console.log('UPDATE SUCCESS. NEW ROLE:', updated.role);
    } catch (e) {
        console.error('UPDATE FAILED:', e);
    }
}

main().finally(() => prisma.$disconnect());
