
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'vineethng203@gmail.com';
    console.log(`Looking for user with email: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error('User not found!');
        return;
    }

    console.log(`Found user: ${user.profile?.firstName} ${user.profile?.lastName} (Current Role: ${user.role})`);

    const updated = await prisma.user.update({
        where: { email },
        data: { role: 'HR' },
    });

    console.log(`SUCCESS: Updated role to ${updated.role} for user ${updated.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
