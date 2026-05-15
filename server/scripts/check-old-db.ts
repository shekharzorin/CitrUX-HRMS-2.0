import { PrismaClient } from '../generated/prisma';

async function checkOldDb() {
  const oldDbUrl = "postgresql://postgres.acdzjznrmjoqqpnemdtu:CXcl91BGQULkJGnx@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  const prismaOld = new PrismaClient({
    datasources: {
      db: {
        url: oldDbUrl,
      },
    },
  });

  try {
    await prismaOld.$connect();
    console.log('✅ Connected to OLD Database (Supabase)');
    
    const companies = await prismaOld.company.count();
    const users = await prismaOld.user.count();
    const profiles = await prismaOld.profile.count();

    console.log('--- OLD Database Stats ---');
    console.log(`Companies: ${companies}`);
    console.log(`Users: ${users}`);
    console.log(`Profiles: ${profiles}`);
    
    if (users > 0) {
       const sampleUser = await prismaOld.user.findFirst({ select: { email: true } });
       console.log('Sample User in Old DB:', sampleUser);
    }

  } catch (e) {
    console.error('❌ Failed to connect to OLD Database:', e);
  } finally {
    await prismaOld.$disconnect();
  }
}

checkOldDb();
