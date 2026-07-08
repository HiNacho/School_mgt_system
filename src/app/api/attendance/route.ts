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
      // 1. Delete existing daily attendance records for this date, class, and arm in one query
      await tx.dailyAttendance.deleteMany({
        where: {
          classId,
          armId,
          attendanceDate: date
        }
      });

      // 2. Insert new daily attendance records in bulk using createMany
      await tx.dailyAttendance.createMany({
        data: records.map(rec => ({
          schoolId,
          studentId: rec.studentId,
          termId,
          classId,
          armId,
          attendanceDate: date,
          status: rec.status,
          markedBy: markedBy || null
        }))
      });

      // 3. Fetch all term logs for these students in a single query
      const studentIds = records.map((r) => r.studentId);
      const allTermLogs = await tx.dailyAttendance.findMany({
        where: {
          studentId: { in: studentIds },
          termId,
        },
      });

      // Group logs by studentId to count present/absent days
      const countsMap = new Map<string, { present: number; absent: number }>();
      for (const id of studentIds) {
        countsMap.set(id, { present: 0, absent: 0 });
      }
      for (const log of allTermLogs) {
        const counts = countsMap.get(log.studentId);
        if (counts) {
          if (log.status === 'PRESENT') counts.present++;
          else if (log.status === 'ABSENT') counts.absent++;
        }
      }

      // 4. Fetch existing termly attendance summaries in a single query
      const existingSummaries = await tx.attendance.findMany({
        where: {
          schoolId,
          termId,
          studentId: { in: studentIds }
        }
      });

      const existingSummariesSet = new Set(existingSummaries.map(s => s.studentId));

      // 5. Update/create termly attendance aggregates in parallel (direct updates/creates)
      await Promise.all(
        studentIds.map((studentId) => {
          const counts = countsMap.get(studentId) || { present: 0, absent: 0 };
          const exists = existingSummariesSet.has(studentId);

          if (exists) {
            return tx.attendance.update({
              where: {
                schoolId_studentId_termId: {
                  schoolId,
                  studentId,
                  termId,
                }
              },
              data: {
                daysPresent: counts.present,
                daysAbsent: counts.absent,
                classId,
                armId
              }
            });
          } else {
            return tx.attendance.create({
              data: {
                schoolId,
                studentId,
                termId,
                classId,
                armId,
                daysPresent: counts.present,
                daysAbsent: counts.absent
              }
            });
          }
        })
      );
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    // Telemetry: increment attendanceSessionsCount if it's a tester
    try {
      if (markedBy) {
        const testerActivity = await prisma.testerActivity.findUnique({
          where: { userId: markedBy }
        });
        if (testerActivity) {
          await prisma.testerActivity.update({
            where: { id: testerActivity.id },
            data: { 
              attendanceSessionsCount: { increment: 1 }
            }
          });
        }
      }
    } catch (telemetryErr) {
      console.error('[Telemetry] Error recording attendance telemetry:', telemetryErr);
    }

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
