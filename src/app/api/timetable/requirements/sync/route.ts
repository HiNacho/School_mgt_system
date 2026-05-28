// Timetable Requirements Auto-Sync API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

function getSmartDefaultPeriods(subjectName: string): number {
  const name = subjectName.toLowerCase();
  
  // Core subjects: 4 or 5 periods/week (normally scheduled daily)
  if (
    name.includes('math') || 
    name.includes('english') || 
    name.includes('science') || 
    name.includes('chemistry') || 
    name.includes('physics') || 
    name.includes('biology')
  ) {
    return 5;
  }
  
  // Major/Medium subjects: 3 periods/week (scheduled 3 times/week)
  if (
    name.includes('agric') || 
    name.includes('french') || 
    name.includes('social') || 
    name.includes('computer') || 
    name.includes('information technology') || 
    name.includes('geography') || 
    name.includes('history') || 
    name.includes('business') || 
    name.includes('economics')
  ) {
    return 3;
  }
  
  // Minor/Elective/Arts: 1 or 2 periods/week (scheduled 1–2 times/week)
  if (
    name.includes('art') || 
    name.includes('music') || 
    name.includes('crs') || 
    name.includes('irs') || 
    name.includes('civic') || 
    name.includes('physical') || 
    name.includes('p.e.') || 
    name.includes('pe') || 
    name.includes('health') || 
    name.includes('literature') || 
    name.includes('drama')
  ) {
    return 1;
  }
  
  // Default fallback for general subjects
  return 2;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    // 1. Find active term, or fallback to any assignments in the school
    // We include the 'subject' relation so we can inspect their names for smart defaulting
    let assignments = [];
    const activeTerm = await prisma.term.findFirst({
      where: { schoolId, isCurrent: true }
    });

    if (activeTerm) {
      assignments = await prisma.subjectAssignment.findMany({
        where: { schoolId, termId: activeTerm.id },
        include: { subject: true }
      });
    } else {
      // Fallback: Query all assignments if no active term is flagged current
      assignments = await prisma.subjectAssignment.findMany({
        where: { schoolId },
        include: { subject: true }
      });
    }

    if (assignments.length === 0) {
      return NextResponse.json({
        success: true,
        syncedCount: 0,
        message: 'No subject assignments found in staff registry.'
      });
    }

    // 2. Filter & Group assignments uniquely by [classId_armId_subjectId]
    const uniqueAssignments = new Map<string, typeof assignments[0]>();
    for (const asg of assignments) {
      const key = `${asg.classId}_${asg.armId}_${asg.subjectId}`;
      uniqueAssignments.set(key, asg);
    }

    const uniqueList = Array.from(uniqueAssignments.values());

    // 3. Upsert them in a database transaction
    // We update the teacherId (in case of reassignments) but preserve existing periodsPerWeek
    await prisma.$transaction(
      uniqueList.map((asg) => {
        const smartPeriods = getSmartDefaultPeriods(asg.subject.name);
        return prisma.timetableRequirement.upsert({
          where: {
            schoolId_classId_armId_subjectId: {
              schoolId,
              classId: asg.classId,
              armId: asg.armId,
              subjectId: asg.subjectId
            }
          },
          update: {
            teacherId: asg.teacherId
            // Note: we do NOT overwrite periodsPerWeek on update to protect admin-customized limits!
          },
          create: {
            schoolId,
            classId: asg.classId,
            armId: asg.armId,
            subjectId: asg.subjectId,
            teacherId: asg.teacherId,
            periodsPerWeek: smartPeriods // Assign dynamically computed smart periods quota
          }
        });
      })
    );

    return NextResponse.json({
      success: true,
      syncedCount: uniqueList.length,
      message: `Successfully synchronized ${uniqueList.length} allocations from staff registry.`
    });
  } catch (error: any) {
    console.error('Timetable Requirements Sync Error:', error);
    return NextResponse.json({ error: 'Failed to synchronize registry allocations' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
