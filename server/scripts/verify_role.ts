
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'vineethng203@gmail.com';
    console.log('CHECKING ROLE FOR:', email);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (user) {
        console.log('CURRENT ROLE:', user.role);
    } else {
        console.log('USER NOT FOUND');
    }
}

main()
    .finally(() => prisma.$disconnect());
