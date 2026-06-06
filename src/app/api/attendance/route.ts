// Student Attendance Sheets API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySubscriptionAccess } from '@/lib/subscriptionRules';


// 1. GET: Fetch students in target class arm with their daily attendance status and termly aggregates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    if (searchParams.get('weekly') === 'true') {
      const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
      const parts = dateParam.split('-');
      const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      
      const currentDay = baseDate.getDay(); 
      const monday = new Date(baseDate);
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      monday.setDate(baseDate.getDate() + distanceToMonday);
      
      const datesOfWeek: string[] = [];
      const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      for (let i = 0; i < 5; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        const yyyy = day.getFullYear();
        const mm = String(day.getMonth() + 1).padStart(2, '0');
        const dd = String(day.getDate()).padStart(2, '0');
        datesOfWeek.push(`${yyyy}-${mm}-${dd}`);
      }
      
      const logs = await prisma.dailyAttendance.findMany({
        where: {
          schoolId,
          attendanceDate: {
            in: datesOfWeek
          }
        },
        select: {
          attendanceDate: true,
          status: true
        }
      });
      
      const weeklyData = daysOfWeek.map((day, index) => {
        const targetDate = datesOfWeek[index];
        const dayLogs = logs.filter(l => l.attendanceDate === targetDate);
        const presentCount = dayLogs.filter(l => l.status === 'PRESENT').length;
        const absentCount = dayLogs.filter(l => l.status === 'ABSENT').length;
        
        return {
          day,
          date: targetDate,
          Present: presentCount,
          Absent: absentCount
        };
      });
      
      return NextResponse.json({
        success: true,
        data: weeklyData
      });
    }

    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const termId = searchParams.get('termId');
    const teacherId = searchParams.get('teacherId'); 
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!termId) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 });
    }

    let targetClassId = classId;
    let targetArmId = armId;

    // A. If teacherId is passed but classId/armId are missing, auto-detect the class teacher's assigned Arm
    if (teacherId && (!targetClassId || !targetArmId)) {
      const assignedArm = await prisma.arm.findFirst({
        where: { schoolId, classTeacherId: teacherId },
        include: { class: true }
      });

      if (!assignedArm) {
        return NextResponse.json({ 
          success: true, 
          data: {
            assigned: false,
            students: [],
            date
          } 
        });
      }

      targetClassId = assignedArm.classId;
      targetArmId = assignedArm.id;
    }

    if (!targetClassId || !targetArmId) {
      return NextResponse.json({ error: 'Class ID and Arm ID are required or could not be detected' }, { status: 400 });
    }

    // B. Fetch active Arm metadata
    const activeArm = await prisma.arm.findUnique({
      where: { id: targetArmId },
      include: { class: true }
    });

    // C. Fetch active students enrolled in this specific Class and Arm
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        classId: targetClassId,
        armId: targetArmId,
        status: 'ACTIVE'
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    // D. Fetch daily attendance records for this date
    const dailyRecords = await prisma.dailyAttendance.findMany({
      where: {
        schoolId,
        classId: targetClassId,
        armId: targetArmId,
        attendanceDate: date
      }
    });

    // E. Fetch term-bound historical records to compute aggregates
    const termDailyLogs = await prisma.dailyAttendance.findMany({
      where: {
        schoolId,
        classId: targetClassId,
        armId: targetArmId,
        termId
      }
    });

    // F. Map student information with daily status and compiled stats
    const mappedStudents = students.map(student => {
      const dailyLog = dailyRecords.find(l => l.studentId === student.id);
      
      // Calculate term-bound historical counts
      const studentLogs = termDailyLogs.filter(l => l.studentId === student.id);
      const totalPresent = studentLogs.filter(l => l.status === 'PRESENT').length;
      const totalAbsent = studentLogs.filter(l => l.status === 'ABSENT').length;
      const totalDays = totalPresent + totalAbsent;
      
      const rate = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 100;
      const atRisk = totalDays > 5 && rate < 70; // Flags warning if low attendance

      return {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        status: dailyLog ? dailyLog.status : 'PRESENT', // Default to present as per standard UI guidelines
        totalPresent,
        totalAbsent,
        attendanceRate: rate,
        atRisk
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        assigned: true,
        class: activeArm?.class,
        arm: { id: activeArm?.id, name: activeArm?.name },
        date,
        taken: dailyRecords.length > 0,
        students: mappedStudents
      }
    });

  } catch (error: any) {
    console.error('Attendance GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve classroom attendance log' }, { status: 500 });
  }
}

// 2. POST: Upsert daily attendance records and automatically sync termly summaries
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, termId, classId, armId, date, records, markedBy } = body; 
    // date: YYYY-MM-DD
    // records: Array<{ studentId: string, status: 'PRESENT' | 'ABSENT' }>

    if (!schoolId || !termId || !classId || !armId || !date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Missing required attendance post fields' }, { status: 400 });
    }

    // Verify subscription access
    const subscriptionError = await verifySubscriptionAccess(schoolId, true);
    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.error }, { status: 403 });
    }


    // Execute daily upserts inside a database transaction to guarantee integrity
    await prisma.$transaction(async (tx) => {
      for (const rec of records) {
        // 1. Upsert daily attendance record
        await tx.dailyAttendance.upsert({
          where: {
            studentId_attendanceDate: {
              studentId: rec.studentId,
              attendanceDate: date
            }
          },
          update: {
            status: rec.status,
            classId,
            armId,
            termId,
            markedBy: markedBy || null
          },
          create: {
            schoolId,
            studentId: rec.studentId,
            termId,
            classId,
            armId,
            attendanceDate: date,
            status: rec.status,
            markedBy: markedBy || null
          }
        });

        // 2. Query historical logs inside term boundaries to compute new aggregates
        const allTermLogs = await tx.dailyAttendance.findMany({
          where: {
            studentId: rec.studentId,
            termId
          }
        });

        const presentCount = allTermLogs.filter(l => l.status === 'PRESENT').length;
        const absentCount = allTermLogs.filter(l => l.status === 'ABSENT').length;

        // 3. Upsert re-calculated aggregates to termly Attendance sheet to sync printable report cards
        await tx.attendance.upsert({
          where: {
            schoolId_studentId_termId: {
              schoolId,
              studentId: rec.studentId,
              termId
            }
          },
          update: {
            daysPresent: presentCount,
            daysAbsent: absentCount,
            classId,
            armId
          },
          create: {
            schoolId,
            studentId: rec.studentId,
            termId,
            classId,
            armId,
            daysPresent: presentCount,
            daysAbsent: absentCount
          }
        });
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Daily classroom attendance successfully recorded & card summaries updated!' 
    });
  } catch (error: any) {
    console.error('Attendance POST Error:', error);
    return NextResponse.json({ error: 'Failed to record classroom attendance sheet' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
