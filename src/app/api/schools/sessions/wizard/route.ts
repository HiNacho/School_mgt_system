import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyJWT } from '@/lib/auth-utils';

// Helper to verify admin permissions
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

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action, schoolId, currentSessionId, newSessionId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId parameter' }, { status: 400 });
    }

    if (admin.role !== 'SUPER_ADMIN' && admin.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden: school tenant mismatch' }, { status: 403 });
    }

    // 1. STEP 1 & 2: Review Current Session / Validate Records
    if (action === 'review') {
      // Find current active session
      const activeSession = await prisma.academicSession.findFirst({
        where: { schoolId, isCurrent: true },
        include: { terms: true }
      });

      if (!activeSession) {
        return NextResponse.json({
          success: true,
          data: {
            activeSession: null,
            studentCount: 0,
            teacherCount: 0,
            scoresSubmitted: true,
            attendanceCompleted: true,
            reportsGenerated: true,
            outstandingTasks: []
          }
        });
      }

      const activeTermIds = activeSession.terms.map(t => t.id);

      // Student and Teacher counts
      const studentCount = await prisma.student.count({
        where: { schoolId, status: 'ACTIVE' }
      });
      const teacherCount = await prisma.user.count({
        where: { schoolId, role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] } }
      });

      // Verification checks:
      // A. Check if there are any pending score submissions
      const pendingSubmissions = await prisma.scoreSubmission.count({
        where: {
          termId: { in: activeTermIds },
          status: 'PENDING'
        }
      });

      // B. Check if attendance has been taken for active terms
      const attendanceCount = await prisma.attendance.count({
        where: { termId: { in: activeTermIds } }
      });

      // C. Check class report approval statuses
      const pendingReports = await prisma.classReportStatus.count({
        where: {
          termId: { in: activeTermIds },
          status: { in: ['DRAFT', 'AWAITING_APPROVAL'] }
        }
      });

      const outstandingTasks: string[] = [];
      if (pendingSubmissions > 0) outstandingTasks.push(`${pendingSubmissions} subject score submissions are pending approval.`);
      if (attendanceCount === 0) outstandingTasks.push(`No term attendance logs recorded for this session.`);
      if (pendingReports > 0) outstandingTasks.push(`${pendingReports} classes have pending report card approvals.`);

      return NextResponse.json({
        success: true,
        data: {
          activeSession,
          studentCount,
          teacherCount,
          scoresSubmitted: pendingSubmissions === 0,
          attendanceCompleted: attendanceCount > 0,
          reportsGenerated: pendingReports === 0,
          outstandingTasks
        }
      });
    }

    // 2. STEP 3: Student Promotion Engine
    if (action === 'promote') {
      const { promotions } = body; // Array of { studentId, toClassId, toArmId, status }
      if (!promotions || !Array.isArray(promotions)) {
        return NextResponse.json({ error: 'Missing promotions array parameter' }, { status: 400 });
      }

      if (!currentSessionId) {
        return NextResponse.json({ error: 'Missing currentSessionId parameter' }, { status: 400 });
      }

      // Execute promotions in a transaction to guarantee atomic operation
      const promotionCount = await prisma.$transaction(async (tx) => {
        let count = 0;
        for (const promo of promotions) {
          const student = await tx.student.findUnique({
            where: { id: promo.studentId }
          });
          if (!student) continue;

          // Record promotion history
          await tx.studentPromotionHistory.create({
            data: {
              schoolId,
              studentId: promo.studentId,
              fromSessionId: currentSessionId,
              toSessionId: newSessionId || null,
              fromClassId: student.classId,
              fromArmId: student.armId,
              toClassId: promo.toClassId || null,
              toArmId: promo.toArmId || null,
              status: promo.status // PROMOTED, RETAINED, WITHDRAWN, TRANSFERRED
            }
          });

          // Update student roster class
          const updateFields: any = {};
          if (promo.status === 'PROMOTED' || promo.status === 'RETAINED') {
            if (promo.toClassId) updateFields.classId = promo.toClassId;
            if (promo.toArmId) updateFields.armId = promo.toArmId;
          } else if (promo.status === 'WITHDRAWN') {
            updateFields.status = 'WITHDRAWN';
          } else if (promo.status === 'TRANSFERRED') {
            updateFields.status = 'TRANSFERRED';
          }

          await tx.student.update({
            where: { id: promo.studentId },
            data: updateFields
          });
          count++;
        }
        return count;
      });

      await logSystemAudit(
        schoolId,
        admin.userId,
        admin.role,
        'PROMOTION_EXECUTED',
        `Executed student promotions roster update for ${promotionCount} students.`,
        req
      );

      return NextResponse.json({ success: true, count: promotionCount });
    }

    // 3. STEP 4: Graduate Final Year Students
    if (action === 'graduate') {
      const { studentIds } = body;
      if (!studentIds || !Array.isArray(studentIds)) {
        return NextResponse.json({ error: 'Missing studentIds array parameter' }, { status: 400 });
      }

      if (!currentSessionId) {
        return NextResponse.json({ error: 'Missing currentSessionId parameter' }, { status: 400 });
      }

      const gradCount = await prisma.$transaction(async (tx) => {
        let count = 0;
        for (const sid of studentIds) {
          const student = await tx.student.findUnique({
            where: { id: sid }
          });
          if (!student) continue;

          await tx.studentPromotionHistory.create({
            data: {
              schoolId,
              studentId: sid,
              fromSessionId: currentSessionId,
              fromClassId: student.classId,
              fromArmId: student.armId,
              status: 'GRADUATED'
            }
          });

          await tx.student.update({
            where: { id: sid },
            data: { status: 'GRADUATED' }
          });
          count++;
        }
        return count;
      });

      await logSystemAudit(
        schoolId,
        admin.userId,
        admin.role,
        'GRADUATION_EXECUTED',
        `Graduated ${gradCount} final year students in the system.`,
        req
      );

      return NextResponse.json({ success: true, count: gradCount });
    }

    // 4. STEP 5: Create Backup, Archive Old Session, and Reset Data
    if (action === 'backup_archive') {
      if (!currentSessionId || !newSessionId) {
        return NextResponse.json({ error: 'Missing currentSessionId or newSessionId parameter' }, { status: 400 });
      }

      const activeSession = await prisma.academicSession.findUnique({
        where: { id: currentSessionId },
        include: { terms: true }
      });

      if (!activeSession) {
        return NextResponse.json({ error: 'Active session to archive not found' }, { status: 404 });
      }

      const activeTermIds = activeSession.terms.map(t => t.id);

      // Snapshot compilation
      console.log('📦 Gathering session details for snapshot backup...');
      const scoresSnapshot = await prisma.score.findMany({
        where: { termId: { in: activeTermIds } }
      });

      const attendanceSnapshot = await prisma.attendance.findMany({
        where: { termId: { in: activeTermIds } }
      });

      const commentsSnapshot = await prisma.reportCardComment.findMany({
        where: { termId: { in: activeTermIds } }
      });

      const reportStatusesSnapshot = await prisma.classReportStatus.findMany({
        where: { termId: { in: activeTermIds } }
      });

      const backupData = JSON.stringify({
        sessionName: activeSession.name,
        archivedAt: new Date().toISOString(),
        scores: scoresSnapshot,
        attendance: attendanceSnapshot,
        comments: commentsSnapshot,
        reportStatuses: reportStatusesSnapshot
      });

      // Execute transaction to lock-in transition
      await prisma.$transaction([
        // A. Create Session Backup record
        prisma.sessionBackup.create({
          data: {
            schoolId,
            sessionId: currentSessionId,
            name: `Backup-${activeSession.name.replace('/', '-')}-${Date.now()}`,
            data: backupData
          }
        }),

        // B. Toggle old session status
        prisma.academicSession.update({
          where: { id: currentSessionId },
          data: {
            isCurrent: false,
            status: 'ARCHIVED',
            archiveDate: new Date()
          }
        }),

        // C. Activate new session
        prisma.academicSession.update({
          where: { id: newSessionId },
          data: {
            isCurrent: true,
            status: 'ACTIVE'
          }
        }),

        // D. Reset parent/student outstanding balance status
        prisma.student.updateMany({
          where: { schoolId, status: 'ACTIVE' },
          data: { feesPaid: false }
        })
      ]);

      // E. Generate Commencing Announcements/Notifications
      const nextSession = await prisma.academicSession.findUnique({
        where: { id: newSessionId }
      });

      const commencementMsg = `The ${nextSession?.name || 'new'} Academic Session has officially commenced. Welcome back to school!`;

      await prisma.announcement.create({
        data: {
          schoolId,
          title: 'New Academic Session Commencement Notice',
          content: commencementMsg,
          date: new Date().toISOString().split('T')[0]
        }
      });

      // Dispatch notifications to active users
      const users = await prisma.user.findMany({
        where: { schoolId, isActive: true },
        select: { id: true }
      });

      for (const u of users) {
        await prisma.notification.create({
          data: {
            schoolId,
            userId: u.id,
            message: commencementMsg
          }
        });
      }

      await logSystemAudit(
        schoolId,
        admin.userId,
        admin.role,
        'SESSION_ARCHIVED',
        `Successfully archived session ${activeSession.name} and activated new session ${nextSession?.name}.`,
        req
      );

      return NextResponse.json({
        success: true,
        message: `A secure backup of the ${activeSession.name} academic session has been created successfully. New session activated.`
      });
    }

    return NextResponse.json({ error: 'Invalid action parameter specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Session Wizard POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
