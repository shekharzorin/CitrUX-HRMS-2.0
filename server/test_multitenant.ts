import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Testing Global Admin flow - Adding a new tenant company...");
    
    try {
        // 1. Create a new company
        const newCompany = await prisma.company.create({
            data: {
                name: "Tech Solutions Inc.",
                domain: "techsolutions",
                plan: "PRO"
            }
        });
        console.log("✅ Successfully created Company:");
        console.log(newCompany);

        // 2. Create a global/super admin user for this company
        const superAdmin = await prisma.user.create({
            data: {
                email: "founder@techsolutions.com",
                passwordHash: "dummy_hashed_password", 
                role: Role.SUPER_ADMIN,
                companyId: newCompany.id,
                profile: {
                    create: {
                        firstName: "Tech",
                        lastName: "Founder",
                        companyId: newCompany.id
                    }
                }
            },
            include: {
                profile: true,
                company: true
            }
        });

        console.log("\n✅ Successfully created SUPER_ADMIN for the new company:");
        console.log({
            id: superAdmin.id,
            email: superAdmin.email,
            role: superAdmin.role,
            company: superAdmin.company?.name,
            profileName: `${superAdmin.profile?.firstName} ${superAdmin.profile?.lastName}`
        });

    } catch (e: any) {
        console.error("❌ Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
