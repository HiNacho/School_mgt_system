const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  console.log('Testing inbox messages query...');
  
  // Find a parent user
  const parentUser = await prisma.user.findFirst({
    where: { role: 'PARENT' }
  });
  
  if (!parentUser) {
    console.error('No parent user found in the database');
    return;
  }

  const userId = parentUser.id;
  const schoolId = parentUser.schoolId;

  console.log(`Querying for userId: ${userId}, schoolId: ${schoolId}`);

  try {
    const received = await prisma.messageRecipient.findMany({
      where: {
        recipientId: userId,
        message: {
          schoolId,
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date().toISOString() } }
          ]
        }
      },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                passportPhoto: true
              }
            }
          }
        }
      },
      orderBy: {
        message: {
          createdAt: 'desc'
        }
      }
    });

    console.log(`Query succeeded! Found ${received.length} received records.`);
  } catch (error) {
    console.error('Query failed with error:', error);
  }
}

test().finally(() => prisma.$disconnect());
