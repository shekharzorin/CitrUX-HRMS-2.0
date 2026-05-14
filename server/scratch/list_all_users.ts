import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { company: true }
  });

  console.log('--- ALL USERS ---');
  users.forEach(u => {
    console.log(`${u.email} | ${u.role} | ${u.company?.name || 'GLOBAL'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
