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
       const dbUsers = await prismaOld.user.findMany({
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
       console.log('--- Users in Supabase DB ---');
       dbUsers.forEach((u, i) => {
         const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : 'No Profile';
         console.log(`${i+1}. ${u.email} - ${name} (${u.profile?.designation ?? 'N/A'})`);
       });
    }

  } catch (e) {
    console.error('❌ Failed to connect to OLD Database:', e);
  } finally {
    await prismaOld.$disconnect();
  }
}

checkOldDb();
