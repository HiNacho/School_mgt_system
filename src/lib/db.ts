import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  let url = process.env.DATABASE_URL || '';
  // Programmatically clamp connection pool size per serverless container to 2 to prevent EMAXCONNSESSION
  if (url.includes('connection_limit=')) {
    url = url.replace(/connection_limit=\d+/, 'connection_limit=2');
  } else if (url) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}connection_limit=2`;
  }

  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
