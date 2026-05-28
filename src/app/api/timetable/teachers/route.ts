// Teacher Workload & Availability Profile API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    // Retrieve all users in this school who have teaching or admin/head roles
    const teachingStaff = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] },
        status: 'ACTIVE'
      },
      include: {
        teacherProfile: true
      },
      orderBy: { lastName: 'asc' }
    });

    // Lazy create profiles for any active teacher who doesn't have one yet
    const teachersWithProfiles = await Promise.all(
      teachingStaff.map(async (user) => {
        if (!user.teacherProfile) {
          const defaultProfile = await prisma.teacherProfile.create({
            data: {
              schoolId,
              userId: user.id,
              maxPeriodsPerDay: 5,
              maxPeriodsPerWeek: 20,
              consecutiveLimit: 3,
              unavailableDays: '',
              unavailableSlots: ''
            }
          });
          return {
            ...user,
            teacherProfile: defaultProfile
          };
        }
        return user;
      })
    );

    const formatted = teachersWithProfiles.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      role: t.role,
      profile: t.teacherProfile
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Timetable Teachers GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve teacher availability roster' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, userId, maxPeriodsPerDay, maxPeriodsPerWeek, consecutiveLimit, unavailableDays, unavailableSlots } = body;

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'School ID and User ID are required parameters' }, { status: 400 });
    }

    const profile = await prisma.teacherProfile.upsert({
      where: { userId },
      update: {
        maxPeriodsPerDay: Number(maxPeriodsPerDay) || 5,
        maxPeriodsPerWeek: Number(maxPeriodsPerWeek) || 20,
        consecutiveLimit: Number(consecutiveLimit) || 3,
        unavailableDays: unavailableDays !== undefined ? String(unavailableDays) : undefined,
        unavailableSlots: unavailableSlots !== undefined ? String(unavailableSlots) : undefined
      },
      create: {
        schoolId,
        userId,
        maxPeriodsPerDay: Number(maxPeriodsPerDay) || 5,
        maxPeriodsPerWeek: Number(maxPeriodsPerWeek) || 20,
        consecutiveLimit: Number(consecutiveLimit) || 3,
        unavailableDays: unavailableDays !== undefined ? String(unavailableDays) : '',
        unavailableSlots: unavailableSlots !== undefined ? String(unavailableSlots) : ''
      }
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('Timetable Teachers POST Error:', error);
    return NextResponse.json({ error: 'Failed to save teacher workload configuration' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
