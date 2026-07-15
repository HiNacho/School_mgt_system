import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Querying all tables in public schema...');
    const result: any[] = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
    );
    console.log('Tables:', result.map(t => t.table_name).join(', '));
  } catch (e: any) {
    console.error('Error listing tables:', e.message || e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
