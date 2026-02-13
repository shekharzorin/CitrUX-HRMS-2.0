
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'vadidek570@cimario.com';
    console.log(`Creating user: ${email}...`);

    // Hash a dummy password
    const passwordHash = await bcrypt.hash('Test@123', 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            passwordHash,
            role: 'EMPLOYEE',
            employeeId: 'EMP-' + Math.floor(Math.random() * 10000), // Correct placement
            profile: {
                create: {
                    firstName: 'Test',
                    lastName: 'User',
                    designation: 'Tester',
                    department: 'QA',
                    dateOfJoining: new Date(), // Correct field name
                    employmentType: 'FULL_TIME'
                }
            }
        },
    });

    console.log('✅ User CREATED/EXISTING:', user.id, user.email);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
