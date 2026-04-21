import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({ select: { id: true, role: true }});
    fs.writeFileSync('roles_backup.json', JSON.stringify(users, null, 2));
    console.log(`Saved roles for ${users.length} users.`);
}

main().finally(() => prisma.$disconnect());
