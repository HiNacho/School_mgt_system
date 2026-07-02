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

  // Optimize connect_timeout to 30s to allow requests to wait rather than crash with 500
  if (url.includes('connect_timeout=')) {
    url = url.replace(/connect_timeout=\d+/, 'connect_timeout=30');
  } else {
    url = `${url}&connect_timeout=30`;
  }

  // Optimize pool_timeout to 30s to allow Prisma client queue to buffer concurrent requests
  if (url.includes('pool_timeout=')) {
    url = url.replace(/pool_timeout=\d+/, 'pool_timeout=30');
  } else {
    url = `${url}&pool_timeout=30`;
  }

  // Debug log (with password masked) to check if using Transaction (6543) or Session (5432) mode
  try {
    const parsedUrl = new URL(url);
    console.log(`📡 [Prisma Init] Connecting to DB: ${parsedUrl.hostname}:${parsedUrl.port || '5432'} | Path: ${parsedUrl.pathname}`);
  } catch (err) {
    console.log('📡 [Prisma Init] Connecting with non-standard database URL');
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
