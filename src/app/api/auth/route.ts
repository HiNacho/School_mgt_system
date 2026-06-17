import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { generateJWT } from '@/lib/auth-utils';
import { verifyRateLimit, logLoginAttempt, AuthError } from '@/lib/auth-middleware';

export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
  let emailOrUsername = '';
  
  try {
    const body = await req.json();
    const { email, password, bypassRole, schoolSlug } = body;
    emailOrUsername = email || '';

    // Enforce rate limiting / brute-force protection
    if (!bypassRole && emailOrUsername) {
      await verifyRateLimit(emailOrUsername, ipAddress);
    }

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

    // 1. Handle Demo Bypass (from Interactive Portal)
    if (bypassRole) {
      if (bypassRole === 'SUPER_ADMIN') {
        user = await prisma.user.findFirst({
          where: { role: 'SUPER_ADMIN', isActive: true },
          include: includeRelations,
        });
      } else {
        const school = await prisma.school.findFirst({
          where: { slug: schoolSlug || 'greenwood-secondary' },
        });

        if (!school) {
          return NextResponse.json({ error: 'Selected school tenant not found' }, { status: 404 });
        }

        user = await prisma.user.findFirst({
          where: {
            schoolId: school.id,
            role: bypassRole,
            isActive: true,
          },
          include: includeRelations,
        });
      }

      if (!user) {
        return NextResponse.json({ error: `Demo account for role ${bypassRole} not seeded` }, { status: 404 });
      }

      // Generate secure JWT session token containing only: userId, role, schoolId
      const token = await generateJWT({
        userId: user.id,
        role: user.role,
        schoolId: user.schoolId
      }, false);

      // Create Login Audit Log
      const userAgent = req.headers.get('user-agent') || 'Unknown Device';
      const auditLog = await prisma.loginAuditLog.create({
        data: {
          userId: user.id,
          ipAddress,
          deviceInfo: userAgent.slice(0, 255)
        }
      });

      // Update lastLogin timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Telemetry: track tester login
      try {
        const testerActivity = await prisma.testerActivity.findUnique({
          where: { userId: user.id }
        });
        if (testerActivity) {
          await prisma.testerActivity.update({
            where: { id: testerActivity.id },
            data: {
              loginCount: { increment: 1 },
              lastLogin: new Date()
            }
          });
          await prisma.lead.update({
            where: { id: testerActivity.leadId },
            data: { leadStatus: 'TESTING' }
          });
        }
      } catch (telemetryErr) {
        console.error('[Telemetry] Error recording tester login:', telemetryErr);
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isFirstLogin: user.isFirstLogin,
          studentId: user.studentId,
          parentId: user.parentId,
          student: user.student,
          parent: user.parent,
        },
        school: user.school ? {
          id: user.school.id,
          name: user.school.name,
          slug: user.school.slug,
          gradingType: user.school.gradingType,
          address: user.school.address,
          logoUrl: user.school.logoUrl,
        } : null,
        token,
        auditLogId: auditLog.id
      });
    }

    // 2. Standard Password Login (Supports Email or Username)
    if (!emailOrUsername || !password) {
      return NextResponse.json({ error: 'Username/Email and password are required' }, { status: 400 });
    }

    user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase().trim() },
          { username: emailOrUsername.toLowerCase().trim() }
        ]
      },
      include: includeRelations,
    });

    // Mask credential errors (no indication of whether username or password was wrong)
    if (!user || !user.isActive) {
      await logLoginAttempt(ipAddress, emailOrUsername, false);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Verify hashed password using bcryptjs
    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordIsValid) {
      await logLoginAttempt(ipAddress, emailOrUsername, false);
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Success: log attempt and login
    await logLoginAttempt(ipAddress, emailOrUsername, true);

    // Generate JWT token containing only: userId, role, schoolId
    const token = await generateJWT({
      userId: user.id,
      role: user.role,
      schoolId: user.schoolId
    }, false);

    // Create Audit Log
    const userAgent = req.headers.get('user-agent') || 'Unknown Device';
    const auditLog = await prisma.loginAuditLog.create({
      data: {
        userId: user.id,
        ipAddress,
        deviceInfo: userAgent.slice(0, 255)
      }
    });

    // Update user login details
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Telemetry: track tester login
    try {
      const testerActivity = await prisma.testerActivity.findUnique({
        where: { userId: user.id }
      });
      if (testerActivity) {
        await prisma.testerActivity.update({
          where: { id: testerActivity.id },
          data: {
            loginCount: { increment: 1 },
            lastLogin: new Date()
          }
        });
        await prisma.lead.update({
          where: { id: testerActivity.leadId },
          data: { leadStatus: 'TESTING' }
        });
      }
    } catch (telemetryErr) {
      console.error('[Telemetry] Error recording tester login:', telemetryErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        studentId: user.studentId,
        parentId: user.parentId,
        student: user.student,
        parent: user.parent,
      },
      school: user.school ? {
        id: user.school.id,
        name: user.school.name,
        slug: user.school.slug,
        gradingType: user.school.gradingType,
        address: user.school.address,
        logoUrl: user.school.logoUrl,
      } : null,
      token,
      auditLogId: auditLog.id
    });

  } catch (error: any) {
    console.error('Auth API Error:', error);
    if (error instanceof AuthError || error.name === 'AuthError' || (error.status && typeof error.status === 'number')) {
      return NextResponse.json({ error: error.message }, { status: error.status || 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
