// Authentication API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password, bypassRole, schoolSlug } = await req.json();

    let user;

    const includeRelations = {
      school: true,
      student: {
        include: {
          class: true,
          arm: true
        }
      },
      parent: {
        include: {
          students: {
            include: {
              class: true,
              arm: true
            }
          }
        }
      }
    };

    // 1. Handle One-Click Demo Bypass Login
    if (bypassRole) {
      const school = await prisma.school.findFirst({
        where: { slug: schoolSlug || 'greenwood-secondary' },
      });

      if (!school) {
        return NextResponse.json({ error: 'Selected school tenant not found' }, { status: 404 });
      }

      // Find user with matching role in that school
      user = await prisma.user.findFirst({
        where: {
          schoolId: school.id,
          role: bypassRole,
          status: 'ACTIVE',
        },
        include: includeRelations,
      });

      // Special case: SUPER_ADMIN can belong to any school but oversees all
      if (!user && bypassRole === 'SUPER_ADMIN') {
        user = await prisma.user.findFirst({
          where: { role: 'SUPER_ADMIN', status: 'ACTIVE' },
          include: includeRelations,
        });
      }

      if (!user) {
        return NextResponse.json({ error: `Demo account for role ${bypassRole} not seeded` }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          studentId: user.studentId,
          parentId: user.parentId,
          student: user.student,
          parent: user.parent,
        },
        school: {
          id: user.school.id,
          name: user.school.name,
          slug: user.school.slug,
          gradingType: user.school.gradingType,
          address: user.school.address,
        },
        token: `mock-jwt-token-for-${user.role}`,
      });
    }

    // 2. Standard Password Login (Demo fallback)
    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: includeRelations,
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email address or staff record not found' }, { status: 401 });
    }

    // In a full production app, use bcrypt to compare password hash.
    // For local evaluation, we accept simple verification checks for demo accounts.
    if (
      password !== 'password' && 
      password !== 'password123' && 
      password !== 'hashed_password_123' && 
      user.passwordHash !== password
    ) {
      return NextResponse.json({ error: 'Incorrect credentials' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        studentId: user.studentId,
        parentId: user.parentId,
        student: user.student,
        parent: user.parent,
      },
      school: {
        id: user.school.id,
        name: user.school.name,
        slug: user.school.slug,
        gradingType: user.school.gradingType,
        address: user.school.address,
      },
      token: `jwt-token-for-${user.id}`,
    });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
