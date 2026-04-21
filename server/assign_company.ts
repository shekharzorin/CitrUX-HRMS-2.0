import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Creating default company...");
    // 1. Create or ensure Default Company exists
    let defaultCompany = await prisma.company.findFirst({
        where: { name: "Default Company" }
    });

    if (!defaultCompany) {
        defaultCompany = await prisma.company.create({
            data: {
                name: "Default Company",
                plan: "STARTER",
                domain: "default.localhost"
            }
        });
        console.log("Created Default Company with ID:", defaultCompany.id);
    } else {
        console.log("Default Company already exists with ID:", defaultCompany.id);
    }

    // 2. Fetch users and assign them to company
    const users = await prisma.user.findMany();
    let updatedUsers = 0;
    
    for (const user of users) {
        if (!user.companyId) {
            await prisma.user.update({
                where: { id: user.id },
                data: { companyId: defaultCompany.id }
            });
            updatedUsers++;
        }
    }
    console.log(`Assigned ${updatedUsers} users to Default Company.`);

    // 3. Profiles
    const profiles = await prisma.profile.findMany();
    let updatedProfiles = 0;
    for (const profile of profiles) {
        if (!profile.companyId) {
            await prisma.profile.update({
                where: { id: profile.id },
                data: { companyId: defaultCompany.id }
            });
            updatedProfiles++;
        }
    }
    console.log(`Assigned ${updatedProfiles} profiles to Default Company.`);

    // 4. Tasks and WorkLogs
    const tasks = await prisma.task.findMany();
    let updatedTasks = 0;
    for (const task of tasks) {
        if (!task.companyId) {
            await prisma.task.update({
                where: { id: task.id },
                data: { companyId: defaultCompany.id }
            });
            updatedTasks++;
        }
    }
    console.log(`Assigned ${updatedTasks} tasks to Default Company.`);

    const worklogs = await prisma.workLog.findMany();
    let updatedWorklogs = 0;
    for (const log of worklogs) {
        if (!log.companyId) {
            await prisma.workLog.update({
                where: { id: log.id },
                data: { companyId: defaultCompany.id }
            });
            updatedWorklogs++;
        }
    }
    console.log(`Assigned ${updatedWorklogs} worklogs to Default Company.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
