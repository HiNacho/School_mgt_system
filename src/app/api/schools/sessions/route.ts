import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth-utils';

// Helper to verify admin permissions and return payload
async function verifyAdmin(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1] || '';
    const payload = await verifyJWT(token);
    
    if (payload.role !== 'SUPER_ADMIN' && payload.role !== 'SCHOOL_ADMIN') {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

// Helper to log system audits
async function logSystemAudit(schoolId: string, userId: string, role: string, action: string, details: string, req: NextRequest) {
  try {
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    await prisma.systemAuditLog.create({
      data: {
        schoolId,
        userId,
        role,
        action,
        details,
        deviceInfo: userAgent.slice(0, 255),
        ipAddress: ipAddress.split(',')[0].trim()
      }
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

// 1. GET: Fetch all sessions for a school with student and teacher counts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId parameter' }, { status: 400 });
    }

    const sessions = await prisma.academicSession.findMany({
      where: { schoolId },
      include: {
        terms: {
          orderBy: { name: 'asc' }
        },
        backups: {
          select: { id: true, createdAt: true }
        }
      },
      orderBy: { name: 'desc' }
    });

    const activeStudentsCount = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' }
    });

    const activeTeachersCount = await prisma.user.count({
      where: {
        schoolId,
        role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] }
      }
    });

    const formattedSessions = sessions.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
      isCurrent: s.isCurrent,
      startDate: s.startDate,
      endDate: s.endDate,
      archiveDate: s.archiveDate,
      hasBackup: s.backups.length > 0,
      studentCount: activeStudentsCount,
      teacherCount: activeTeachersCount,
      terms: s.terms
    }));

    return NextResponse.json({ success: true, data: formattedSessions });
  } catch (error: any) {
    console.error('Sessions GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Create a new academic session
export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { schoolId, name, startDate, endDate, terms } = body;

    if (!schoolId || !name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters: schoolId, name, startDate, endDate' }, { status: 400 });
    }

    // Enforce Tenant Boundary check
    if (admin.role !== 'SUPER_ADMIN' && admin.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden: school tenant mismatch' }, { status: 403 });
    }

    // 1. Prevent duplicate sessions
    const existingSession = await prisma.academicSession.findFirst({
      where: { schoolId, name: name.trim() }
    });
    if (existingSession) {
      return NextResponse.json({ error: `Academic session ${name} already exists.` }, { status: 400 });
    }

    // 2. Prevent overlapping session dates
    const overlapSession = await prisma.academicSession.findFirst({
      where: {
        schoolId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate }
          }
        ]
      }
    });
    if (overlapSession) {
      return NextResponse.json({
        error: `Session dates overlap with an existing session (${overlapSession.name}: ${overlapSession.startDate} to ${overlapSession.endDate}).`
      }, { status: 400 });
    }

    // 3. Create session (isCurrent starts as false, activated later)
    const newSession = await prisma.academicSession.create({
      data: {
        schoolId,
        name: name.trim(),
        startDate,
        endDate,
        status: 'ACTIVE',
        isCurrent: false
      }
    });

    // 4. Create terms for the session
    const termNames = ['First Term', 'Second Term', 'Third Term'];
    for (let i = 0; i < termNames.length; i++) {
      const termInput = terms?.find((t: any) => t.name === termNames[i]);
      await prisma.term.create({
        data: {
          schoolId,
          sessionId: newSession.id,
          name: termNames[i],
          isCurrent: i === 0, // Make First Term current by default
          startDate: termInput?.startDate || null,
          endDate: termInput?.endDate || null
        }
      });
    }

    await logSystemAudit(
      schoolId,
      admin.userId,
      admin.role,
      'SESSION_CREATED',
      `Created new academic session ${name.trim()} (${startDate} to ${endDate})`,
      req
    );

    return NextResponse.json({ success: true, data: newSession });
  } catch (error: any) {
    console.error('Sessions POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 3. PATCH: Edit session dates, switch active session, or restore archived session
export async function PATCH(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, schoolId, startDate, endDate, isCurrent, status } = body;

    if (!id || !schoolId) {
      return NextResponse.json({ error: 'Missing session ID or school ID' }, { status: 400 });
    }

    // Tenant Check
    if (admin.role !== 'SUPER_ADMIN' && admin.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden: tenant mismatch' }, { status: 403 });
    }

    const session = await prisma.academicSession.findUnique({
      where: { id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Academic session not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (status) {
      updateData.status = status;
      if (status === 'ARCHIVED') {
        updateData.archiveDate = new Date();
      } else {
        updateData.archiveDate = null;
      }
    }

    // Switch current active session
    if (isCurrent === true) {
      // Deactivate all other sessions
      await prisma.academicSession.updateMany({
        where: { schoolId },
        data: { isCurrent: false }
      });
      updateData.isCurrent = true;
      updateData.status = 'ACTIVE';
    } else if (isCurrent === false) {
      updateData.isCurrent = false;
    }

    const updatedSession = await prisma.academicSession.update({
      where: { id },
      data: updateData
    });

    // If making current, open the first term as current and close others
    if (isCurrent === true) {
      await prisma.term.updateMany({
        where: { schoolId, sessionId: id },
        data: { isCurrent: false }
      });
      // Find the first term of this session to set current
      const firstTerm = await prisma.term.findFirst({
        where: { sessionId: id, name: 'First Term' }
      });
      if (firstTerm) {
        await prisma.term.update({
          where: { id: firstTerm.id },
          data: { isCurrent: true }
        });
      }
    }

    await logSystemAudit(
      schoolId,
      admin.userId,
      admin.role,
      'SESSION_UPDATED',
      `Updated session ${session.name} (isCurrent: ${isCurrent || 'unchanged'}, status: ${status || 'unchanged'})`,
      req
    );

    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error: any) {
    console.error('Sessions PATCH Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 4. DELETE: Completely delete a session (must be ARCHIVED first to prevent accidental loss)
export async function DELETE(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const schoolId = searchParams.get('schoolId');

    if (!id || !schoolId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden: tenant mismatch' }, { status: 403 });
    }

    const session = await prisma.academicSession.findUnique({
      where: { id }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.isCurrent) {
      return NextResponse.json({ error: 'Cannot delete the active current session.' }, { status: 400 });
    }

    if (session.status !== 'ARCHIVED') {
      return NextResponse.json({ error: 'Only archived sessions can be deleted.' }, { status: 400 });
    }

    // Delete session records (Cascade deletes terms, backups, etc.)
    await prisma.academicSession.delete({
      where: { id }
    });

    await logSystemAudit(
      schoolId,
      admin.userId,
      admin.role,
      'SESSION_DELETED',
      `Permanently deleted archived session: ${session.name}`,
      req
    );

    return NextResponse.json({ success: true, message: 'Session deleted successfully' });
  } catch (error: any) {
    console.error('Sessions DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
