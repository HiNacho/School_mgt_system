import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'BURSAR']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const guardians = await prisma.studentGuardian.findMany({
      where: { studentId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ success: true, data: guardians });
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
    const guardian = await prisma.studentGuardian.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        firstName: body.firstName,
        lastName: body.lastName,
        relationship: body.relationship,
        phone: body.phone || null,
        email: body.email || null,
        occupation: body.occupation || null,
        employer: body.employer || null,
        address: body.address || null,
        photo: body.photo || null,
        preferredComMethod: body.preferredComMethod || null,
        isPrimary: body.isPrimary || false,
        isBillingContact: body.isBillingContact || false,
        isEmergencyContact: body.isEmergencyContact || false,
        isNotificationRecipient: body.isNotificationRecipient !== false,
      },
    });
    return NextResponse.json({ success: true, data: guardian }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const body = await req.json();
    const { guardianId, ...updates } = body;
    if (!guardianId) return NextResponse.json({ error: 'guardianId required' }, { status: 400 });

    const guardian = await prisma.studentGuardian.update({ where: { id: guardianId }, data: updates });
    return NextResponse.json({ success: true, data: guardian });
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
    const guardianId = searchParams.get('guardianId');
    if (!guardianId) return NextResponse.json({ error: 'guardianId query param required' }, { status: 400 });

    await prisma.studentGuardian.delete({ where: { id: guardianId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
