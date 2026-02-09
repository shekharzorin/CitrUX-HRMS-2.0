import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting Performance Review Verification...");

    // 1. Setup Users
    const managerEmail = 'manager_test@citrux.com';
    const employeeEmail = 'employee_test@citrux.com';

    let manager = await prisma.user.findUnique({ where: { email: managerEmail } });
    if (!manager) {
        console.log("Creating Test Manager...");
        manager = await prisma.user.create({
            data: {
                email: managerEmail,
                passwordHash: 'dummy',
                role: 'MANAGER'
            }
        });
    }

    let employee = await prisma.user.findUnique({ where: { email: employeeEmail } });
    if (!employee) {
        console.log("Creating Test Employee...");
        employee = await prisma.user.create({
            data: {
                email: employeeEmail,
                passwordHash: 'dummy',
                role: 'EMPLOYEE'
            }
        });
    }

    // 2. Create Review
    console.log("Creating Performance Review...");
    const review = await prisma.performanceReview.create({
        data: {
            userId: employee.id,
            reviewerId: manager.id,
            period: 'Q1 2026 Test',
            rating: 5,
            feedback: 'Excellent work on the test case.'
        }
    });
    console.log(`Review Created: ${review.id}`);

    // 3. Verify getTeamReviews Logic (Manager View)
    console.log("Testing Manager Query Logic...");
    const managerReviews = await prisma.performanceReview.findMany({
        where: { reviewerId: manager.id },
        include: {
            user: { include: { profile: true } },
            reviewer: { include: { profile: true } }
        }
    });

    const found = managerReviews.find(r => r.id === review.id);
    if (found) {
        console.log("SUCCESS: Manager can see the review they created.");
    } else {
        console.error("FAILURE: Manager CANNOT see the review they created.");
        process.exit(1);
    }

    // 4. Verify Admin View (Fetch All)
    console.log("Testing Admin Query Logic...");
    const allReviews = await prisma.performanceReview.findMany({
        where: {}, // No filter
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    const foundAdmin = allReviews.find(r => r.id === review.id);
    if (foundAdmin) {
        console.log("SUCCESS: Admin can see the review.");
    } else {
        console.error("FAILURE: Admin query did not include the new review.");
        process.exit(1);
    }

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
