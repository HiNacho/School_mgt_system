import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';

// POST: Allows superadmin to message school admins (specific school or broadcast to all)
// GET: Retrieve all active support conversations involving superadmin
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    const conversations = await prisma.chatConversation.findMany({
      where: {
        OR: [
          { parentId: session.userId },
          { teacherId: session.userId }
        ]
      },
      include: {
        school: { select: { name: true, slug: true } },
        parent: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, role: true } }
          }
        }
      },
      orderBy: { lastActivity: 'desc' }
    });

    return NextResponse.json({ success: true, data: conversations });
  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Superadmin GET Messages Error:', error);
    return NextResponse.json({ error: `Server error: ${error.message || error}` }, { status: 500 });
  }
}

// POST: Allows superadmin to message school admins (specific school or broadcast to all)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    const body = await req.json();
    const { schoolId, title, body: msgBody } = body;

    if (!schoolId || !title || !msgBody) {
      return NextResponse.json({ error: 'Missing required parameters (schoolId, title, body).' }, { status: 400 });
    }

    // Resolve target school IDs
    let targetSchools: Array<{ id: string }> = [];
    if (schoolId === 'ALL') {
      targetSchools = await prisma.school.findMany({
        select: { id: true }
      });
    } else {
      const exists = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!exists) {
        return NextResponse.json({ error: 'Selected school tenant not found.' }, { status: 404 });
      }
      targetSchools = [{ id: schoolId }];
    }

    let dispatchedCount = 0;
    const processedLogs: string[] = [];

    // Process each target school
    for (const school of targetSchools) {
      // Find active school admins inside this school
      const admins = await prisma.user.findMany({
        where: {
          schoolId: school.id,
          role: 'SCHOOL_ADMIN',
          status: 'ACTIVE'
        },
        select: { id: true, firstName: true, lastName: true }
      });

      if (admins.length === 0) continue;

      // Create a Message announcement record for this school context
      const message = await prisma.message.create({
        data: {
          schoolId: school.id,
          senderId: session.userId, // linked to the superadmin User
          title: title.trim(),
          body: msgBody.trim(),
          messageType: 'ANNOUNCEMENT',
          targetAudience: 'ALL',
          priority: 'HIGH'
        }
      });

      // Bind recipients
      for (const admin of admins) {
        await prisma.messageRecipient.create({
          data: {
            messageId: message.id,
            recipientId: admin.id
          }
        });
        dispatchedCount++;
      }
      processedLogs.push(`Dispatched broadcast to school (${school.id}) with ${admins.length} active admins.`);
    }

    return NextResponse.json({
      success: true,
      dispatchedCount,
      processedLogs
    });

  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Superadmin Message Error:', error);
    return NextResponse.json({ error: `Failed to dispatch superadmin message: ${error.message || error}` }, { status: 500 });
  }
}
