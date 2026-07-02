import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET(req: NextRequest) {
  let prismaInstance: PrismaClient | null = null;
  const reports: any = {};

  try {
    const rawUrl = process.env.DATABASE_URL || '';
    
    // Mask password and inspect characters safely
    let maskedUrl = 'empty';
    if (rawUrl) {
      try {
        const u = new URL(rawUrl);
        u.password = '••••••••';
        maskedUrl = u.toString();
      } catch (e) {
        maskedUrl = 'invalid URL format';
      }
    }

    const first15 = rawUrl.slice(0, 15);
    const last15 = rawUrl.slice(-15);

    reports.env = {
      DATABASE_URL_exists: !!rawUrl,
      DATABASE_URL_length: rawUrl.length,
      DATABASE_URL_first15: first15,
      DATABASE_URL_last15: last15,
      DATABASE_URL_first15_codes: [...first15].map(c => c.charCodeAt(0)),
      DATABASE_URL_last15_codes: [...last15].map(c => c.charCodeAt(0)),
      DATABASE_URL_masked: maskedUrl,
      NODE_ENV: process.env.NODE_ENV
    };

    console.log('[Diagnostic] Initializing PrismaClient...');
    
    // Read the processed URL from our db.ts helper
    let url = rawUrl;
    if (url.includes('connection_limit=')) {
      url = url.replace(/connection_limit=\d+/, 'connection_limit=2');
    } else if (url) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}connection_limit=2`;
    }
    
    if (url.includes('connect_timeout=')) {
      url = url.replace(/connect_timeout=\d+/, 'connect_timeout=30');
    } else if (url) {
      url = `${url}&connect_timeout=30`;
    }

    if (url.includes('pool_timeout=')) {
      url = url.replace(/pool_timeout=\d+/, 'pool_timeout=30');
    } else if (url) {
      url = `${url}&pool_timeout=30`;
    }

    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url
        }
      }
    });

    console.log('[Diagnostic] Executing prisma.$connect()...');
    await prismaInstance.$connect();
    
    console.log('[Diagnostic] Executing test query (User.count)...');
    const userCount = await prismaInstance.user.count();
    
    reports.database = {
      connected: true,
      userCount,
      message: 'Successfully established database connection and ran query!'
    };

    return NextResponse.json({ success: true, reports });

  } catch (error: any) {
    console.error('[Diagnostic] Connection failed:', error);
    reports.database = {
      connected: false,
      errorName: error.name || 'UnknownError',
      errorMessage: error.message || 'No error message provided',
      errorCode: error.code || null,
      errorMeta: error.meta || null,
      stack: error.stack || null
    };

    return NextResponse.json({ success: false, reports }, { status: 500 });
  } finally {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
    }
  }
}

export const dynamic = 'force-dynamic';
