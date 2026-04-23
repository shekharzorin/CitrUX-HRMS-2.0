const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testStats() {
    try {
        console.log("Testing Stats Query...");
        const users = await prisma.user.count();
        console.log("Total Users:", users);

        const profiles = await prisma.$queryRaw`
            SELECT "firstName", "lastName", "dob"
            FROM "Profile" 
            WHERE "dob" IS NOT NULL
        `;
        console.log("Profiles count:", profiles.length);
        console.log("TEST SUCCESSFUL");
    } catch (error) {
        console.error("STATS TEST FAILED");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testStats();
