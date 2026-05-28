// Timetable Slots API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const teacherId = searchParams.get('teacherId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    const whereClause: any = { schoolId };
    if (classId) whereClause.classId = classId;
    if (armId) whereClause.armId = armId;
    if (teacherId) whereClause.teacherId = teacherId;

    const slots = await prisma.timetableSlot.findMany({
      where: whereClause,
      include: {
        class: true,
        arm: true,
        subject: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { day: 'asc' },
        { periodNumber: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, data: slots });
  } catch (error: any) {
    console.error('Timetable Slots GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve scheduled slots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, classId, armId, subjectId, teacherId, day, periodNumber, isLocked } = body;

    if (!schoolId || !classId || !armId || !subjectId || !teacherId || !day || !periodNumber) {
      return NextResponse.json({ error: 'Missing required slot parameters' }, { status: 400 });
    }

    const periodNum = Number(periodNumber);

    // 1. Conflict Check: Teacher Clash (is this teacher teaching elsewhere at the same time?)
    const teacherClash = await prisma.timetableSlot.findFirst({
      where: {
        schoolId,
        teacherId,
        day,
        periodNumber: periodNum,
        NOT: {
          classId,
          armId
        }
      },
      include: {
        class: true,
        arm: true
      }
    });

    let conflictWarning = null;
    if (teacherClash) {
      conflictWarning = `Teacher is already scheduled to teach ${teacherClash.class.name} ${teacherClash.arm.name} on ${day} Period ${periodNum}.`;
    }

    // 2. Class Clash: If another subject is already at this slot, we upsert (which overwrites it due to unique constraint).
    const slot = await prisma.timetableSlot.upsert({
      where: {
        schoolId_classId_armId_day_periodNumber: {
          schoolId,
          classId,
          armId,
          day,
          periodNumber: periodNum
        }
      },
      update: {
        subjectId,
        teacherId,
        isLocked: isLocked !== undefined ? Boolean(isLocked) : undefined
      },
      create: {
        schoolId,
        classId,
        armId,
        subjectId,
        teacherId,
        day,
        periodNumber: periodNum,
        isLocked: isLocked !== undefined ? Boolean(isLocked) : false
      },
      include: {
        class: true,
        arm: true,
        subject: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: slot,
      conflict: conflictWarning
    });
  } catch (error: any) {
    console.error('Timetable Slots POST Error:', error);
    return NextResponse.json({ error: 'Failed to save scheduled slot' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const id = searchParams.get('id');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const resetAll = searchParams.get('resetAll');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    if (id) {
      // Delete single slot by id
      await prisma.timetableSlot.delete({
        where: { id }
      });
      return NextResponse.json({ success: true, message: 'Slot cleared successfully' });
    }

    if (classId && armId) {
      // Clear ONLY UNLOCKED slots for class + arm
      await prisma.timetableSlot.deleteMany({
        where: { schoolId, classId, armId, isLocked: false }
      });
      return NextResponse.json({ success: true, message: 'Timetable cleared for this class arm (excluding locked slots)' });
    }

    if (resetAll === 'true') {
      // Wipe ONLY UNLOCKED slots for the entire school
      await prisma.timetableSlot.deleteMany({
        where: { schoolId, isLocked: false }
      });
      return NextResponse.json({ success: true, message: 'All unlocked school timetable slots wiped successfully' });
    }

    return NextResponse.json({ error: 'Invalid delete parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Timetable Slots DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to clear timetable slots' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
