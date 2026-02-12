
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSalary() {
    try {
        console.log('🌱 Seeding Salary Structures...');
        const users = await prisma.user.findMany({
            where: { role: 'EMPLOYEE' }
        });

        for (const user of users) {
            const existing = await prisma.salaryStructure.findUnique({ where: { userId: user.id } });
            if (!existing) {
                const ctc = 600000; // 6 LPA
                const basic = ctc * 0.4 / 12; // 20k
                const hra = basic * 0.5; // 10k
                const allowances = (ctc / 12) - basic - hra; // Balance

                await prisma.salaryStructure.create({
                    data: {
                        userId: user.id,
                        ctc: ctc,
                        basic: basic,
                        hra: hra,
                        allowances: allowances,
                        professionalTax: 200,
                        pf: 1800
                    }
                });
                console.log(`✅ Added Salary for ${user.email}`);
            } else {
                console.log(`ℹ️ Salary already exists for ${user.email}`);
            }
        }
        console.log('Done!');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

seedSalary();
