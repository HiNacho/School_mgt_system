const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const parentUser = await prisma.user.findFirst({
    where: { role: 'PARENT' }
  });
  
  if (!parentUser) {
    console.error('No parent user found');
    return;
  }
  
  const schoolId = parentUser.schoolId;
  const userId = parentUser.id;
  const mode = 'inbox';

  console.log(`Calling API for parent user: ${parentUser.username} (${userId})`);
  try {
    const res = await fetch(`http://localhost:3000/api/messages?schoolId=${schoolId}&userId=${userId}&mode=${mode}`);
    const json = await res.json();
    console.log('Status code:', res.status);
    console.log('Response body:', json);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

run().finally(() => prisma.$disconnect());
