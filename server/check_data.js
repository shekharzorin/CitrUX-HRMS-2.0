const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { name: { contains: 'isnap', mode: 'insensitive' } },
    select: { id: true, name: true }
  });
  console.log('Companies:', companies);

  if (companies.length > 0) {
    const cid = companies[0].id;
    const users = await prisma.user.findMany({
      where: { companyId: cid },
      include: { profile: true },
      take: 5
    });
    console.log('Users in isnap:', users.map(u => ({ email: u.email, name: `${u.profile?.firstName} ${u.profile?.lastName}` })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
