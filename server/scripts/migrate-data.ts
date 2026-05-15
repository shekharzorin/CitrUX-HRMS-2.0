import { PrismaClient } from '../generated/prisma';

async function migrate() {
  const oldDbUrl = "postgresql://postgres.acdzjznrmjoqqpnemdtu:CXcl91BGQULkJGnx@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";
  const newDbUrl = "postgresql://c48c4cc6620cec88141e1b34dd5c84d3ff6b6a558ed463701d4b13d040109b3e:sk_pngdzI6E1snyqSit9Cc-P@db.prisma.io:5432/postgres?sslmode=verify-full";

  const prismaOld = new PrismaClient({ datasources: { db: { url: oldDbUrl } } });
  const prismaNew = new PrismaClient({ datasources: { db: { url: newDbUrl } } });

  try {
    console.log('🚀 Starting Data Migration...');

    // 1. Migrate Companies
    const companies = await prismaOld.company.findMany();
    console.log(`📦 Migrating ${companies.length} Companies...`);
    for (const company of companies) {
      await prismaNew.company.upsert({
        where: { id: company.id },
        update: company,
        create: company
      });
    }

    // 2. Migrate Shifts
    const shifts = await prismaOld.shift.findMany();
    console.log(`📦 Migrating ${shifts.length} Shifts...`);
    for (const shift of shifts) {
      await prismaNew.shift.upsert({
        where: { id: shift.id },
        update: shift,
        create: shift
      });
    }

    // 3. Migrate Users (excluding self-referential managerId for now)
    const users = await prismaOld.user.findMany();
    console.log(`📦 Migrating ${users.length} Users...`);
    for (const user of users) {
      const { managerId, ...userData } = user;
      await prismaNew.user.upsert({
        where: { id: user.id },
        update: userData,
        create: userData
      });
    }

    // 4. Update Manager Relations
    console.log(`🔗 Restoring Manager Relations...`);
    for (const user of users) {
      if (user.managerId) {
        await prismaNew.user.update({
          where: { id: user.id },
          data: { managerId: user.managerId }
        });
      }
    }

    // 5. Migrate Profiles
    const profiles = await prismaOld.profile.findMany();
    console.log(`📦 Migrating ${profiles.length} Profiles...`);
    for (const profile of profiles) {
      await prismaNew.profile.upsert({
        where: { id: profile.id },
        update: profile,
        create: profile
      });
    }

    // 6. Migrate Attendance Policy
    const policies = await prismaOld.attendancePolicy.findMany();
    console.log(`📦 Migrating ${policies.length} Attendance Policies...`);
    for (const policy of policies) {
      await prismaNew.attendancePolicy.upsert({
        where: { id: policy.id },
        update: policy,
        create: policy
      });
    }

    // 7. Migrate Leave Types
    const leaveTypes = await prismaOld.leaveType.findMany();
    console.log(`📦 Migrating ${leaveTypes.length} Leave Types...`);
    for (const lt of leaveTypes) {
      await prismaNew.leaveType.upsert({
        where: { id: lt.id },
        update: lt,
        create: lt
      });
    }

    console.log('✅ Migration Completed Successfully!');

  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await prismaOld.$disconnect();
    await prismaNew.$disconnect();
  }
}

migrate();
