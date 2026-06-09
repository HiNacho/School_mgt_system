import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const role = searchParams.get('role');

    if (!schoolId || !role) {
      return NextResponse.json({ error: 'schoolId and role parameters are required' }, { status: 400 });
    }

    let users = [];

    if (role === 'PARENT') {
      const parents = await prisma.parent.findMany({
        where: { schoolId, status: 'ACTIVE' },
        include: {
          user: true,
          students: {
            include: {
              class: true,
              arm: true
            }
          }
        }
      });
      
      users = parents
        .filter(p => p.user)
        .map(p => ({
          id: p.id,
          email: p.email,
          username: p.user?.username || '',
          firstName: p.firstName,
          lastName: p.lastName,
          role: 'PARENT',
          extraInfo: p.students && p.students.length > 0
            ? `Parent of: ${p.students.map((s: any) => `${s.firstName} ${s.lastName} (${s.class?.name || ''}${s.arm?.name || ''})`).join(', ')}`
            : 'No registered children'
        }));
    } else if (role === 'STUDENT') {
      const students = await prisma.student.findMany({
        where: { schoolId, status: 'ACTIVE' },
        include: {
          user: true,
          class: true,
          arm: true
        }
      });

      users = students
        .filter(s => s.user)
        .map(s => ({
          id: s.id,
          email: s.user?.email || '',
          username: s.user?.username || '',
          firstName: s.firstName,
          lastName: s.lastName,
          role: 'STUDENT',
          extraInfo: `${s.class?.name || ''}${s.arm?.name ? ` Arm ${s.arm.name}` : ''} — Adm No: ${s.admissionNumber}`
        }));
    } else {
      // Staff roles: SCHOOL_ADMIN, CLASS_TEACHER, SUBJECT_TEACHER
      const staff = await prisma.user.findMany({
        where: {
          schoolId,
          role,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          role: true
        }
      });
      users = staff;
    }

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Demo Users Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch demo accounts' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
