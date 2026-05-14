import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding...');
  // Starter models — replace with your own
  const company = await prisma.company.upsert({
    where: { name: 'Citrux Corp' },
    update: {},
    create: {
      name: 'Citrux Corp',
    },
  });
  console.log({ company });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
