// Timetable Subject Requirements API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    const whereClause: any = { schoolId };
    if (classId) whereClause.classId = classId;
    if (armId) whereClause.armId = armId;

    const requirements = await prisma.timetableRequirement.findMany({
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
        { class: { name: 'asc' } },
        { arm: { name: 'asc' } },
        { subject: { name: 'asc' } }
      ]
    });

    return NextResponse.json({ success: true, data: requirements });
  } catch (error: any) {
    console.error('Timetable Requirements GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve subject allocations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      schoolId, 
      classId, 
      armId, 
      subjectId, 
      teacherId, 
      periodsPerWeek,
      doublePeriod,
      preferredDays,
      restrictedDays,
      combinedWithArmId,
      isSplit
    } = body;

    if (!schoolId || !classId || !armId || !subjectId || !teacherId) {
      return NextResponse.json({ error: 'Missing required subject allocation parameters' }, { status: 400 });
    }

    const periodsCount = Number(periodsPerWeek);
    if (periodsCount <= 0) {
      // If periods <= 0, we can delete the requirement
      await prisma.timetableRequirement.deleteMany({
        where: { schoolId, classId, armId, subjectId }
      });
      return NextResponse.json({ success: true, message: 'Requirement removed successfully' });
    }

    const requirement = await prisma.timetableRequirement.upsert({
      where: {
        schoolId_classId_armId_subjectId: {
          schoolId,
          classId,
          armId,
          subjectId
        }
      },
      update: {
        teacherId,
        periodsPerWeek: periodsCount,
        doublePeriod: doublePeriod !== undefined ? Boolean(doublePeriod) : undefined,
        preferredDays: preferredDays !== undefined ? String(preferredDays) : undefined,
        restrictedDays: restrictedDays !== undefined ? String(restrictedDays) : undefined,
        combinedWithArmId: combinedWithArmId !== undefined ? String(combinedWithArmId) : undefined,
        isSplit: isSplit !== undefined ? Boolean(isSplit) : undefined
      },
      create: {
        schoolId,
        classId,
        armId,
        subjectId,
        teacherId,
        periodsPerWeek: periodsCount,
        doublePeriod: doublePeriod !== undefined ? Boolean(doublePeriod) : false,
        preferredDays: preferredDays || "",
        restrictedDays: restrictedDays || "",
        combinedWithArmId: combinedWithArmId || "",
        isSplit: isSplit !== undefined ? Boolean(isSplit) : false
      }
    });

    return NextResponse.json({ success: true, data: requirement });
  } catch (error: any) {
    console.error('Timetable Requirements POST Error:', error);
    return NextResponse.json({ error: 'Failed to save subject allocation requirement' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Requirement ID is required' }, { status: 400 });
    }

    await prisma.timetableRequirement.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Allocation requirement deleted successfully' });
  } catch (error: any) {
    console.error('Timetable Requirements DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete allocation requirement' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
