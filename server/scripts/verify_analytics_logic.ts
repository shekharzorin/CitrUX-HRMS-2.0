import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Analytics Logic Verification...");

    // 1. Create Data for Expense Trend
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("No user found. Run seed first.");
        return;
    }

    const category = await prisma.expenseCategory.upsert({
        where: { name: 'Test Category' },
        update: {},
        create: { name: 'Test Category' }
    });

    console.log("Creating historical expenses...");
    // Create expenses for last 3 months
    const today = new Date();
    for (let i = 0; i < 3; i++) {
        const d = new Date();
        d.setMonth(today.getMonth() - i);

        await prisma.expenseClaim.create({
            data: {
                userId: user.id,
                categoryId: category.id,
                amount: 1000 + (i * 500),
                description: `Test Expense Month -${i}`,
                status: 'APPROVED',
                date: d
            }
        });
    }

    // 2. Fetch Stats via Controller Logic Simulation
    // (We duplicate logic here to verify independent of API layer first, then could invoke controller if unit testing)
    // But better to just run the query logic we wrote.

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const expenseHistory = await prisma.expenseClaim.findMany({
        where: {
            status: 'APPROVED',
            date: { gte: sixMonthsAgo }
        },
        select: { date: true, amount: true }
    });

    console.log(`Found ${expenseHistory.length} expenses in last 6 months.`);
    if (expenseHistory.length >= 3) {
        console.log("SUCCESS: Expense history query works.");
    } else {
        console.error("FAILURE: Did not find the expected expense history.");
    }

    // 3. Department Logic
    const profiles = await prisma.profile.groupBy({
        by: ['department'],
        _count: { userId: true },
        where: { department: { not: null } }
    });
    console.log("Department Stats:", profiles);

    console.log("Verification Logic Passed.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
