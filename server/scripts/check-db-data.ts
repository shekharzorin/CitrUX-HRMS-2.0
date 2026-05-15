import { prisma } from '../src/lib/prisma';

async function checkCounts() {
  try {
    const companies = await prisma.company.count();
    const users = await prisma.user.count();
    const attendance = await prisma.attendance.count();
    const profiles = await prisma.profile.count();

    console.log('--- Database Stats ---');
    console.log(`Companies: ${companies}`);
    console.log(`Users: ${users}`);
    console.log(`Profiles: ${profiles}`);
    console.log(`Attendance Records: ${attendance}`);
    
    if (users > 0) {
      const sampleUser = await prisma.user.findFirst({ select: { email: true, role: true } });
      console.log('Sample User:', sampleUser);
    }
  } catch (e) {
    console.error('Error checking counts:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkCounts();
