import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🔥 Starting System Smoke Test...");
    let passed = true;

    try {
        // 1. Database Connectivity
        process.stdout.write("1. Checking Database Connectivity... ");
        await prisma.$connect();
        console.log("✅ OK");

        // 2. User Existence Check
        process.stdout.write("2. Verifying Core Users... ");
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const employee = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });

        if (admin && employee) {
            console.log("✅ OK");
        } else {
            console.log("⚠️ WARNING: Admin or Employee not found. Seeding might be needed.");
            // Non-fatal for smoke test logic unless we need them for next steps
        }

        // 3. Analytics Module Check
        process.stdout.write("3. Testing Analytics Aggregations... ");
        try {
            const userIdCount = await prisma.user.count();
            const deptStats = await prisma.profile.groupBy({
                by: ['department'],
                _count: { userId: true },
                where: { department: { not: null } }
            });
            console.log(`✅ OK (Users: ${userIdCount}, Depts: ${deptStats.length})`);
        } catch (e) {
            console.log("❌ FAILED");
            console.error(e);
            passed = false;
        }

        // 4. Performance Module Check
        process.stdout.write("4. Testing Performance Review Queries... ");
        try {
            // Simulate Manager Fetch
            await prisma.performanceReview.findMany({
                where: { reviewerId: admin?.id || 'dummy' }, // admin often acts as manager
                take: 1
            });
            // Simulate Employee Fetch
            await prisma.performanceReview.findMany({
                where: { userId: employee?.id || 'dummy' },
                take: 1
            });
            console.log("✅ OK");
        } catch (e) {
            console.log("❌ FAILED");
            console.error(e);
            passed = false;
        }

        // 5. Profile & Payroll Check
        process.stdout.write("5. Testing Profile & Salary Fetch... ");
        try {
            const userWithDetails = await prisma.user.findFirst({
                include: {
                    profile: true,
                    salary: true,
                    onboarding: true
                }
            });
            if (userWithDetails) {
                console.log("✅ OK");
            } else {
                console.log("⚠️ SKIPPED (No users to fetch)");
            }
        } catch (e) {
            console.log("❌ FAILED");
            console.error(e);
            passed = false;
        }

    } catch (error) {
        console.error("\n❌ FATAL ERROR During Smoke Test:");
        console.error(error);
        passed = false;
    } finally {
        await prisma.$disconnect();
    }

    if (passed) {
        console.log("\n✨ Smoke Test Passed: System appears stable.");
        process.exit(0);
    } else {
        console.log("\n💥 Smoke Test Failed: Check logs above.");
        process.exit(1);
    }
}

main();
