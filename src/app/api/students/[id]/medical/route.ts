import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

const FULL_MEDICAL_ROLES = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER'];
const REDACTED_ROLES = ['CLASS_TEACHER', 'SUBJECT_TEACHER'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, [...FULL_MEDICAL_ROLES, ...REDACTED_ROLES]);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const medical = await prisma.studentMedical.findUnique({ where: { studentId } });

    if (!medical) return NextResponse.json({ success: true, data: null });

    // Redact sensitive fields for class/subject teachers
    if (REDACTED_ROLES.includes(session.role)) {
      return NextResponse.json({
        success: true,
        data: {
          bloodGroup: medical.bloodGroup,
          genotype: medical.genotype,
          allergies: medical.allergies,
          visualImpairment: medical.visualImpairment,
          hearingImpairment: medical.hearingImpairment,
          specialNeeds: medical.specialNeeds,
          emergencyNotes: medical.emergencyNotes,
          _redacted: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: medical });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, FULL_MEDICAL_ROLES);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const body = await req.json();

    const medical = await prisma.studentMedical.upsert({
      where: { studentId },
      create: { schoolId: student.schoolId, studentId, ...body },
      update: body,
    });

    return NextResponse.json({ success: true, data: medical });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
