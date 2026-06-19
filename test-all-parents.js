const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Querying all parent users...');
  const parents = await prisma.user.findMany({
    where: { role: 'PARENT' }
  });

  console.log(`Found ${parents.length} parents in database.`);

  for (const parent of parents) {
    const schoolId = parent.schoolId;
    const userId = parent.id;
    const mode = 'inbox';

    try {
      const res = await fetch(`http://localhost:3000/api/messages?schoolId=${schoolId}&userId=${userId}&mode=${mode}`);
      const json = await res.json();
      if (!res.ok) {
        console.error(`❌ Parent ${parent.username} (${userId}) failed with status ${res.status}:`, json.error);
      } else {
        console.log(`✅ Parent ${parent.username} (${userId}) succeeded. Records: ${json.data.length}`);
      }
    } catch (err) {
      console.error(`❌ Fetch failed for parent ${parent.username} (${userId}):`, err);
    }
  }
}

run().finally(() => prisma.$disconnect());
