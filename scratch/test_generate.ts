import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const schoolId = 'c47f0190-50e4-4a14-9668-a393fbf6473e';

async function main() {
  console.log('🚀 Triggering local timetable generation API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/timetable/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ schoolId }),
    });

    const data = await response.json();
    console.log('📊 Timetable Generation Response:', JSON.stringify(data, null, 2));

    // Verify slots in database
    const slotCount = await prisma.timetableSlot.count({
      where: { schoolId }
    });
    console.log(`🔒 Total timetable slots in DB: ${slotCount}`);
  } catch (error) {
    console.error('❌ Error hitting generation endpoint:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
