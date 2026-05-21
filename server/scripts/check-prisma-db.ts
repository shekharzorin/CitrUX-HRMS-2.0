import { PrismaClient } from '../generated/prisma';

async function checkPrismaDb() {
  const prismaUrl = "postgresql://c48c4cc6620cec88141e1b34dd5c84d3ff6b6a558ed463701d4b13d040109b3e:sk_pngdzI6E1snyqSit9Cc-P@db.prisma.io:5432/postgres?sslmode=verify-full";
  const prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: prismaUrl,
      },
    },
  });

  try {
    await prismaClient.$connect();
    console.log('✅ Connected to Prisma Postgres Database');
    
    const companies = await prismaClient.company.count();
    const users = await prismaClient.user.count();
    const profiles = await prismaClient.profile.count();

    console.log('--- Prisma Postgres Database Stats ---');
    console.log(`Companies: ${companies}`);
    console.log(`Users: ${users}`);
    console.log(`Profiles: ${profiles}`);
    
    if (users > 0) {
       const dbUsers = await prismaClient.user.findMany({
         select: {
           email: true,
           profile: {
             select: {
               firstName: true,
               lastName: true,
               designation: true
             }
           }
         }
       });
       console.log('--- Users in Prisma Postgres DB ---');
       dbUsers.forEach((u, i) => {
         const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : 'No Profile';
         console.log(`${i+1}. ${u.email} - ${name} (${u.profile?.designation ?? 'N/A'})`);
       });
    }

  } catch (e: any) {
    console.error('❌ Failed to connect to Prisma Postgres Database:', e.message || e);
  } finally {
    await prismaClient.$disconnect();
  }
}

checkPrismaDb();
