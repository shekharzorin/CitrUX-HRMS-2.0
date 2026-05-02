const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findUnique({ where: { email: 'shekharzorin@gmail.com' } });
        console.log('USER_FOUND:', JSON.stringify(user, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
