// Subjects & Teacher Assignments API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch all subjects and active teacher assignments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // A. Fetch Subjects
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { scores: true }
        }
      }
    });

    // B. Fetch active Terms and Sessions to select for assignments
    const terms = await prisma.term.findMany({
      where: { schoolId },
      include: { session: true },
      orderBy: { name: 'asc' }
    });

    // Fetch existing class levels first to prevent Prisma crashes on orphaned arms
    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true }
    });
    const classIds = classes.map(c => c.id);

    // C. Fetch all Class Arms (only for existing classes to prevent Prisma crashes on orphaned arms)
    const arms = await prisma.arm.findMany({
      where: { 
        schoolId,
        classId: { in: classIds }
      },
      include: { class: true },
      orderBy: [
        { class: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    // D. Fetch Staff Accounts
    const teachers = await prisma.user.findMany({
      where: { 
        schoolId, 
        role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER', 'SCHOOL_ADMIN'] },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    const armIds = arms.map(a => a.id);

    // E. Fetch Subject Assignments (only for existing classes and arms to prevent Prisma crashes on orphaned assignments)
    const assignments = await prisma.subjectAssignment.findMany({
      where: { 
        schoolId,
        classId: { in: classIds },
        armId: { in: armIds }
      },
      include: {
        subject: true,
        class: true,
        arm: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        term: {
          include: { session: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        subjects,
        terms,
        arms,
        teachers,
        assignments
      }
    });
  } catch (error: any) {
    console.error('Subjects GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch subject registries' }, { status: 500 });
  }
}

// 2. POST: Create a new Subject or register a Teacher Assignment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, schoolId, name, code, category, subjectId, armId, teacherId, termId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // A. Create new Subject
    if (type === 'SUBJECT') {
      if (!name || !code) {
        return NextResponse.json({ error: 'Subject Name and Shortcode are required' }, { status: 400 });
      }

      // Check if duplicate code or name exists for this school
      const duplicate = await prisma.subject.findFirst({
        where: {
          schoolId,
          OR: [
            { name: name.trim() },
            { code: code.trim().toUpperCase() }
          ]
        }
      });

      if (duplicate) {
        return NextResponse.json({ error: `A subject with name "${name}" or code "${code}" already exists.` }, { status: 400 });
      }

      const newSubject = await prisma.subject.create({
        data: {
          schoolId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          category: category || 'COMPULSORY'
        }
      });

      return NextResponse.json({ success: true, data: newSubject });
    }

    // B. Assign Teacher to Subject
    else if (type === 'ASSIGNMENT') {
      if (!subjectId || !armId || !teacherId || !termId) {
        return NextResponse.json({ error: 'Missing subject, teacher, classroom, or term selection' }, { status: 400 });
      }

      // Retrieve Class ID from Arm context
      const arm = await prisma.arm.findFirst({
        where: { id: armId, schoolId }
      });

      if (!arm) {
        return NextResponse.json({ error: 'Class arm subdivision not found' }, { status: 404 });
      }

      // Check if this assignment already exists (same teacher/subject/arm/term)
      const existing = await prisma.subjectAssignment.findFirst({
        where: {
          schoolId,
          subjectId,
          classId: arm.classId,
          armId,
          termId,
        }
      });

      if (existing) {
        return NextResponse.json({ error: 'A teacher is already assigned to this subject in this classroom arm for this term.' }, { status: 400 });
      }

      const assignment = await prisma.subjectAssignment.create({
        data: {
          schoolId,
          subjectId,
          classId: arm.classId,
          armId,
          teacherId,
          termId
        },
        include: {
          subject: true,
          class: true,
          arm: true,
          teacher: true
        }
      });

      return NextResponse.json({ success: true, data: assignment });
    }

    else {
      return NextResponse.json({ error: 'Invalid operation type specified. Use SUBJECT or ASSIGNMENT.' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Subjects POST Error:', error);
    return NextResponse.json({ error: 'Failed to record subject parameter' }, { status: 500 });
  }
}

// 3. DELETE: Delete a Subject or de-allocate a Teacher Assignment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('id');
    const subjectId = searchParams.get('subjectId');
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // A. Delete Subject itself
    if (subjectId) {
      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId }
      });

      if (!subject) {
        return NextResponse.json({ error: 'Subject not found within current school boundary' }, { status: 404 });
      }

      await prisma.subject.delete({
        where: { id: subjectId }
      });

      return NextResponse.json({ success: true, message: 'Subject and all associated scores and assignments permanently deleted.' });
    }

    // B. De-allocate Teacher Assignment
    if (assignmentId) {
      // Verify ownership
      const assignment = await prisma.subjectAssignment.findFirst({
        where: { id: assignmentId, schoolId }
      });

      if (!assignment) {
        return NextResponse.json({ error: 'Subject Assignment slot not found within current school boundary' }, { status: 404 });
      }

      // Delete allocation record
      await prisma.subjectAssignment.delete({
        where: { id: assignmentId }
      });

      return NextResponse.json({ success: true, message: 'Teacher successfully de-allocated from teaching slot.' });
    }

    return NextResponse.json({ error: 'Subject ID or Assignment ID is required' }, { status: 400 });
  } catch (error: any) {
    console.error('Subjects DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute delete operation' }, { status: 500 });
  }
}

// 4. PUT: Update Subject color and restrictions matrix
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, subjectId, color, restrictions } = body;

    if (!schoolId || !subjectId) {
      return NextResponse.json({ error: 'School ID and Subject ID are required' }, { status: 400 });
    }

    const updatedSubject = await prisma.subject.update({
      where: { id: subjectId, schoolId },
      data: {
        color: color !== undefined ? color : undefined,
        restrictions: restrictions !== undefined ? restrictions : undefined
      }
    });

    return NextResponse.json({ success: true, data: updatedSubject });
  } catch (error: any) {
    console.error('Subjects PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update subject matrix parameters' }, { status: 500 });
  }
}
