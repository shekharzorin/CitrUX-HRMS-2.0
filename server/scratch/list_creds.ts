import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- COMPANIES ---');
  const companies = await prisma.company.findMany();
  companies.forEach(c => console.log(`${c.name} (ID: ${c.id})`));

  console.log('\n--- ADMIN USERS ---');
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ['SUPER_ADMIN', 'ADMIN'] }
    },
    include: {
      company: true
    }
  });

  admins.forEach(u => {
    console.log(`Email: ${u.email} | Role: ${u.role} | Company: ${u.company?.name || 'N/A'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
