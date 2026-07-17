import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const dryRun = searchParams.get('dryRun') === 'true'; // If true, just return matches without creating chats/messages

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    // 1. Get today's month and day (format: "MM-DD")
    const today = new Date();
    const targetMonthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 2. Fetch all active students and parents in the school
    const students = await prisma.student.findMany({
      where: { schoolId, status: 'ACTIVE' },
      include: {
        parent: {
          include: {
            user: { select: { id: true } }
          }
        },
        class: true,
        arm: {
          include: {
            classTeacher: true
          }
        }
      }
    });

    const parents = await prisma.parent.findMany({
      where: { schoolId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true } },
        students: {
          include: {
            class: true,
            arm: {
              include: {
                classTeacher: true
              }
            }
          }
        }
      }
    });

    // Helper to check if date string matches target month-day
    const isBirthday = (dobString: string | null | undefined) => {
      if (!dobString) return false;
      const clean = dobString.replace(/\//g, '-'); // replace slashes with hyphens
      return clean.includes(targetMonthDay);
    };

    // Filter birthday students and parents
    const birthdayStudents = students.filter(s => isBirthday(s.dateOfBirth));
    const birthdayParents = parents.filter(p => isBirthday(p.dateOfBirth));

    const processedLogs: string[] = [];

    // Find the default school administrator for fallback sender
    const defaultAdmin = await prisma.user.findFirst({
      where: { schoolId, role: 'SCHOOL_ADMIN', status: 'ACTIVE' }
    });

    if (!dryRun) {
      // Process Student Birthdays
      for (const student of birthdayStudents) {
        if (!student.parent?.user?.id) continue;
        const parentUserId = student.parent.user.id;

        // Resolve Class Teacher for this student from their arm details
        const teacherUserId = student.arm?.classTeacher?.id || '';

        const adminUserId = defaultAdmin?.id;

        // Message 1: From Teacher to Parent celebrating child's birthday
        if (teacherUserId) {
          const teacherConv = await getOrCreateConv(schoolId, student.id, parentUserId, teacherUserId);
          await prisma.chatMessage.create({
            data: {
              conversationId: teacherConv.id,
              senderId: teacherUserId,
              body: `Happy Birthday to your child, ${student.firstName} ${student.lastName}! Wishing them a wonderful year filled with growth, learning, and joy! 🎂🎉`
            }
          });
          await prisma.chatConversation.update({
            where: { id: teacherConv.id },
            data: { lastActivity: new Date() }
          });
          processedLogs.push(`Sent child birthday message from Teacher (${teacherUserId}) to Parent (${parentUserId}) for student ${student.firstName}`);
        }

        // Message 2: From Admin to Parent celebrating child's birthday
        if (adminUserId && adminUserId !== teacherUserId) {
          const adminConv = await getOrCreateConv(schoolId, student.id, parentUserId, adminUserId);
          await prisma.chatMessage.create({
            data: {
              conversationId: adminConv.id,
              senderId: adminUserId,
              body: `On behalf of the school administration, we wish your child, ${student.firstName} ${student.lastName}, a very Happy Birthday! May their day be bright and filled with blessings! 🎈🥳`
            }
          });
          await prisma.chatConversation.update({
            where: { id: adminConv.id },
            data: { lastActivity: new Date() }
          });
          processedLogs.push(`Sent child birthday message from Admin (${adminUserId}) to Parent (${parentUserId}) for student ${student.firstName}`);
        }
      }

      // Process Parent Birthdays
      for (const parent of birthdayParents) {
        if (!parent.user?.id) continue;
        const parentUserId = parent.user.id;

        // Resolve first child and class teacher
        let childId = '';
        let teacherUserId = '';
        if (parent.students.length > 0) {
          const student = parent.students[0];
          childId = student.id;
          teacherUserId = student.arm?.classTeacher?.id || '';
        }

        // Fallback dummy student if parent has no registered students
        if (!childId) {
          const dummy = await prisma.student.findFirst({ where: { schoolId } });
          if (dummy) childId = dummy.id;
        }

        const adminUserId = defaultAdmin?.id;

        if (!childId) continue; // Skip if no child could be resolved at all

        // Message 1: From Teacher to Parent celebrating parent's birthday
        if (teacherUserId) {
          const teacherConv = await getOrCreateConv(schoolId, childId, parentUserId, teacherUserId);
          await prisma.chatMessage.create({
            data: {
              conversationId: teacherConv.id,
              senderId: teacherUserId,
              body: `Happy Birthday, ${parent.firstName} ${parent.lastName}! We hope you have a beautiful, relaxing day and a wonderful year ahead! 🌸🎂`
            }
          });
          await prisma.chatConversation.update({
            where: { id: teacherConv.id },
            data: { lastActivity: new Date() }
          });
          processedLogs.push(`Sent parent birthday message from Teacher (${teacherUserId}) to Parent (${parentUserId})`);
        }

        // Message 2: From Admin to Parent celebrating parent's birthday
        if (adminUserId && adminUserId !== teacherUserId) {
          const adminConv = await getOrCreateConv(schoolId, childId, parentUserId, adminUserId);
          await prisma.chatMessage.create({
            data: {
              conversationId: adminConv.id,
              senderId: adminUserId,
              body: `Happy Birthday, ${parent.firstName} ${parent.lastName}! Sending you warm wishes and blessings from all of us here at the school administration office! 🎉✨`
            }
          });
          await prisma.chatConversation.update({
            where: { id: adminConv.id },
            data: { lastActivity: new Date() }
          });
          processedLogs.push(`Sent parent birthday message from Admin (${adminUserId}) to Parent (${parentUserId})`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      targetMonthDay,
      birthdayStudentsCount: birthdayStudents.length,
      birthdayParentsCount: birthdayParents.length,
      birthdayStudents: birthdayStudents.map(s => `${s.firstName} ${s.lastName} (DOB: ${s.dateOfBirth})`),
      birthdayParents: birthdayParents.map(p => `${p.firstName} ${p.lastName} (DOB: ${p.dateOfBirth})`),
      processedLogs
    });

  } catch (error: any) {
    console.error('Birthday Automation Error:', error);
    return NextResponse.json({ error: `Automation failed: ${error.message || error}` }, { status: 500 });
  }
}

async function getOrCreateConv(schoolId: string, studentId: string, parentId: string, teacherId: string) {
  let conv = await prisma.chatConversation.findFirst({
    where: { schoolId, studentId, parentId, teacherId }
  });

  if (!conv) {
    conv = await prisma.chatConversation.create({
      data: {
        schoolId,
        studentId,
        parentId,
        teacherId,
        category: 'GENERAL',
        subject: 'Direct Chat',
        status: 'OPEN'
      }
    });
  }
  return conv;
}
