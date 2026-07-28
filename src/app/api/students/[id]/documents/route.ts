import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const docs = await prisma.studentDocument.findMany({
      where: { studentId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: docs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const body = await req.json();

    // Get current version for same doc type
    const existing = await prisma.studentDocument.findFirst({
      where: { studentId, documentType: body.documentType, archivedAt: null },
      orderBy: { version: 'desc' },
    });

    if (existing) {
      // Archive old version
      await prisma.studentDocument.update({
        where: { id: existing.id },
        data: { archivedAt: new Date() },
      });
    }

    const doc = await prisma.studentDocument.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        documentType: body.documentType,
        name: body.name,
        url: body.url,
        mimeType: body.mimeType || null,
        sizeBytes: body.sizeBytes || null,
        version: existing ? existing.version + 1 : 1,
        uploadedById: session.userId,
      },
    });

    // Log to student timeline
    await prisma.studentTimeline.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        eventType: 'DOCUMENT',
        title: 'Document Uploaded',
        description: `${body.documentType.replace(/_/g, ' ')} — ${body.name}`,
        referenceId: doc.id,
      },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('docId');
    if (!docId) return NextResponse.json({ error: 'docId query param required' }, { status: 400 });

    // Soft-delete (archive)
    await prisma.studentDocument.update({ where: { id: docId }, data: { archivedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
