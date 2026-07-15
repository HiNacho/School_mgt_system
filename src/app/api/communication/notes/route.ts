import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// GET: Fetch internal notes for a student (Staff-only)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');

    const session = await requireAuth(req);

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: 'School ID and Student ID are required' }, { status: 400 });
    }

    // Role-based security boundary: block Parents and Students from internal notes
    const isStaff =
      session.role === 'CLASS_TEACHER' ||
      session.role === 'SUBJECT_TEACHER' ||
      session.role === 'HEAD_TEACHER' ||
      session.role === 'SCHOOL_ADMIN' ||
      session.role === 'SUPER_ADMIN';

    if (!isStaff) {
      return NextResponse.json({ error: 'Access denied: Staff notes are strictly internal.' }, { status: 403 });
    }

    const notes = await prisma.teacherNote.findMany({
      where: {
        schoolId,
        studentId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          select: { firstName: true, lastName: true, role: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: notes });

  } catch (error: any) {
    console.error('Teacher Notes GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch internal notes' }, { status: 500 });
  }
}

// POST: Add a new private note for a student
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, studentId, note } = body;

    const session = await requireAuth(req);

    if (!schoolId || !studentId || !note || note.trim() === '') {
      return NextResponse.json({ error: 'Missing required note parameters' }, { status: 400 });
    }

    // Role-based security boundary: staff-only
    const isStaff =
      session.role === 'CLASS_TEACHER' ||
      session.role === 'SUBJECT_TEACHER' ||
      session.role === 'HEAD_TEACHER' ||
      session.role === 'SCHOOL_ADMIN' ||
      session.role === 'SUPER_ADMIN';

    if (!isStaff) {
      return NextResponse.json({ error: 'Access denied: Staff notes are strictly internal.' }, { status: 403 });
    }

    const newNote = await prisma.teacherNote.create({
      data: {
        schoolId,
        studentId,
        teacherId: session.userId,
        note
      },
      include: {
        teacher: {
          select: { firstName: true, lastName: true, role: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: newNote });

  } catch (error: any) {
    console.error('Teacher Notes POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit internal note' }, { status: 500 });
  }
}
