import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetEmail = 'shekharzorin@gmail.com';
  const oldSuperAdmin = 'superadmin@citrux.com';

  console.log(`Promoting ${targetEmail} to SUPER_ADMIN...`);

  try {
    // 1. Update the target user
    const updated = await prisma.user.update({
      where: { email: targetEmail },
      data: {
        role: 'SUPER_ADMIN',
        companyId: null // Global scope
      }
    });
    console.log(`✅ Success! ${targetEmail} is now a SUPER_ADMIN.`);

    // 2. Remove the old super admin to avoid confusion (or just demote it)
    await prisma.user.delete({
      where: { email: oldSuperAdmin }
    }).catch(e => console.log('Old superadmin not found or already deleted.'));
    
    console.log(`✅ Old dummy account ${oldSuperAdmin} removed.`);

  } catch (e: any) {
    console.error('❌ Failed to update roles:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
