import { prisma } from '../src/lib/prisma';

async function verify() {
  try {
    await prisma.company.findFirst();
    console.log('✅ Connected');
  } catch (e) {
    console.error('❌ Connection failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}
verify();
