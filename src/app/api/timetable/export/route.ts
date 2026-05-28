// Timetable CSV / Excel Export API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface ComputedPeriod {
  label: string;
  start: string;
  end: string;
  isBreak: boolean;
  periodNum?: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const type = searchParams.get('type') || 'class'; // 'class' or 'teacher'
    const targetId = searchParams.get('id'); // classId_armId or teacherId

    if (!schoolId) {
      return new NextResponse('School ID is required', { status: 400 });
    }

    // 1. Fetch config settings for time slots
    const settings = await prisma.timetableSetting.findUnique({
      where: { schoolId }
    });

    const schoolDays = settings?.schoolDays 
      ? settings.schoolDays.split(',').map(d => d.trim()) 
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periodsPerDay = settings?.periodsPerDay || 6;
    const startTime = settings?.startTime || "08:00";
    const periodDuration = settings?.periodDuration || 40;
    const breakAfter = settings?.breakAfter || 3;
    const breakDuration = settings?.breakDuration || 30;

    // Helper: Compute time slots
    const getPeriodsList = (): ComputedPeriod[] => {
      const list: ComputedPeriod[] = [];
      let [hours, minutes] = startTime.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        hours = 8;
        minutes = 0;
      }

      let actualPeriodNum = 1;

      for (let i = 1; i <= periodsPerDay; i++) {
        const startStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        minutes += periodDuration;
        while (minutes >= 60) {
          minutes -= 60;
          hours += 1;
        }
        const endStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        
        list.push({
          label: `Period ${actualPeriodNum}`,
          start: startStr,
          end: endStr,
          isBreak: false,
          periodNum: actualPeriodNum
        });
        
        actualPeriodNum++;

        if (i === breakAfter) {
          const breakStart = endStr;
          minutes += breakDuration;
          while (minutes >= 60) {
            minutes -= 60;
            hours += 1;
          }
          const breakEnd = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          
          list.push({
            label: 'Recess Break',
            start: breakStart,
            end: breakEnd,
            isBreak: true
          });
        }
      }
      return list;
    };

    const periods = getPeriodsList();

    // 2. Fetch all matching slots
    const slots = await prisma.timetableSlot.findMany({
      where: { schoolId },
      include: {
        class: true,
        arm: true,
        subject: true,
        teacher: true
      }
    });

    let csvContent = '';
    let filename = 'timetable.csv';

    if (type === 'class') {
      if (!targetId) return new NextResponse('Class Arm ID is required', { status: 400 });
      const [classId, armId] = targetId.split('_');

      // Fetch class & arm names
      const arm = await prisma.arm.findFirst({
        where: { id: armId, classId },
        include: { class: true }
      });
      const name = arm ? `${arm.class.name} - ${arm.name}` : 'Class';
      filename = `${name.replace(/\s+/g, '_')}_Timetable.csv`;

      // Header row
      csvContent += `Class Timetable: ${name}\n`;
      csvContent += `Time Block,${schoolDays.join(',')}\n`;

      // Populate periods rows
      for (const p of periods) {
        if (p.isBreak) {
          csvContent += `Recess (${p.start} - ${p.end}),${schoolDays.map(() => 'BREAK').join(',')}\n`;
        } else {
          let row = `"${p.label} (${p.start} - ${p.end})"`;
          for (const day of schoolDays) {
            const cell = slots.find(
              s => s.classId === classId && s.armId === armId && s.day === day && s.periodNumber === p.periodNum
            );
            if (cell) {
              row += `,"${cell.subject.name} (Mr/Mrs ${cell.teacher.lastName})"`;
            } else {
              row += ',"-"';
            }
          }
          csvContent += row + '\n';
        }
      }
    } else {
      // Teacher view
      if (!targetId) return new NextResponse('Teacher ID is required', { status: 400 });

      const teacher = await prisma.user.findFirst({
        where: { id: targetId, schoolId }
      });
      const name = teacher ? `${teacher.lastName} ${teacher.firstName}` : 'Teacher';
      filename = `${name.replace(/\s+/g, '_')}_Timetable.csv`;

      csvContent += `Instructor Diary: ${name}\n`;
      csvContent += `Time Block,${schoolDays.join(',')}\n`;

      for (const p of periods) {
        if (p.isBreak) {
          csvContent += `Recess (${p.start} - ${p.end}),${schoolDays.map(() => 'BREAK').join(',')}\n`;
        } else {
          let row = `"${p.label} (${p.start} - ${p.end})"`;
          for (const day of schoolDays) {
            const cell = slots.find(
              s => s.teacherId === targetId && s.day === day && s.periodNumber === p.periodNum
            );
            if (cell) {
              row += `,"${cell.class.name} ${cell.arm.name} (${cell.subject.name})"`;
            } else {
              row += ',"-"';
            }
          }
          csvContent += row + '\n';
        }
      }
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    console.error('Timetable CSV Export Error:', error);
    return new NextResponse('Failed to generate CSV export', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
