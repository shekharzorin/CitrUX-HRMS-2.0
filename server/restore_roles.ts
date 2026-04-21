import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    if (!fs.existsSync('roles_backup.json')) {
        console.log("No backup found.");
        return;
    }
    const backup = JSON.parse(fs.readFileSync('roles_backup.json', 'utf8'));
    let restored = 0;
    for (const b of backup) {
        try {
            await prisma.user.update({
                where: { id: b.id },
                data: { role: b.role }
            });
            restored++;
        } catch (e: any) {
            console.error(`Failed to restore role for user ${b.id}:`, e.message);
        }
    }
    console.log(`Restored roles for ${restored} users.`);
}

main().finally(() => prisma.$disconnect());
