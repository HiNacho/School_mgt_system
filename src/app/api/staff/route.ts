// Staff Accounts API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySubscriptionAccess } from '@/lib/subscriptionRules';


// 1. GET: Fetch all staff accounts in current school tenant context
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const staffId = searchParams.get('staffId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    if (staffId) {
      const s = await prisma.user.findFirst({
        where: { id: staffId, schoolId },
        include: {
          classTeacherArms: {
            include: {
              class: true
            }
          },
          subjectAssignments: {
            include: {
              subject: true,
              class: true,
              arm: true
            }
          }
        }
      });

      if (!s) {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: s.id,
          email: s.email,
          firstName: s.firstName,
          lastName: s.lastName,
          role: s.role,
          phone: s.phone || 'Not Provided',
          passportPhoto: s.passportPhoto || null,
          status: s.status,
          createdAt: s.createdAt,
          classTeacherArms: s.classTeacherArms,
          subjectAssignments: s.subjectAssignments
        }
      });
    }

    const staff = await prisma.user.findMany({
      where: { 
        schoolId,
        NOT: {
          role: { in: ['PARENT', 'STUDENT'] }
        }
      },
      include: {
        classTeacherArms: true,
        subjectAssignments: {
          select: {
            id: true,
            subjectId: true,
            armId: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { lastName: 'asc' }
      ]
    });

    const formatted = staff.map(s => ({
      id: s.id,
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      phone: s.phone || 'Not Provided',
      passportPhoto: s.passportPhoto || null,
      status: s.status,
      createdAt: s.createdAt,
      classTeacherArms: s.classTeacherArms,
      subjectAssignments: s.subjectAssignments
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Staff GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch school staff registry' }, { status: 500 });
  }
}

// 2. POST: Create a new Staff Account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      schoolId, email, firstName, lastName, role, phone, passportPhoto,
      classTeacherArmId, subjectAssignments 
    } = body;

    if (!schoolId || !email || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required staff fields' }, { status: 400 });
    }

    // Verify subscription access
    const subscriptionError = await verifySubscriptionAccess(schoolId, true);
    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.error }, { status: 403 });
    }


    // Check if email already exists globally in SaaS system
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return NextResponse.json({ error: 'A staff member with this email address is already registered on the platform.' }, { status: 400 });
    }

    // Run in transaction to guarantee relational allocations succeed or rollback cleanly
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create staff user
      const user = await tx.user.create({
        data: {
          schoolId,
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          phone: phone || null,
          passportPhoto: passportPhoto || null,
          status: 'ACTIVE',
          passwordHash: 'password' // Default demo password
        }
      });

      // 2. Assign as class teacher (if CLASS_TEACHER and classTeacherArmId provided)
      if (role === 'CLASS_TEACHER' && classTeacherArmId) {
        const arm = await tx.arm.findFirst({
          where: { id: classTeacherArmId, schoolId }
        });
        if (arm) {
          await tx.arm.update({
            where: { id: classTeacherArmId },
            data: { classTeacherId: user.id }
          });
        }
      }

      // 3. Assign teaching subjects (if subjectAssignments array provided)
      if (Array.isArray(subjectAssignments) && subjectAssignments.length > 0) {
        const currentTerm = await tx.term.findFirst({
          where: { schoolId, isCurrent: true }
        });

        if (currentTerm) {
          for (const sa of subjectAssignments) {
            const { subjectId, armId } = sa;
            if (!subjectId || !armId) continue;

            const arm = await tx.arm.findFirst({
              where: { id: armId, schoolId }
            });
            if (!arm) continue;

            // Check if duplicate assignment exists
            const duplicate = await tx.subjectAssignment.findFirst({
              where: {
                schoolId,
                subjectId,
                classId: arm.classId,
                armId,
                termId: currentTerm.id,
                teacherId: user.id
              }
            });

            if (!duplicate) {
              await tx.subjectAssignment.create({
                data: {
                  schoolId,
                  subjectId,
                  classId: arm.classId,
                  armId,
                  teacherId: user.id,
                  termId: currentTerm.id
                }
              });
            }
          }
        }
      }

      return user;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Staff POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create new staff profile' }, { status: 500 });
  }
}

// 3. PUT: Toggle Staff Account Status (ACTIVE / INACTIVE / ARCHIVED)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, status, schoolId, staffIds } = body;

    if (!status || !schoolId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (staffIds && Array.isArray(staffIds)) {
      // Prevent deactivating sole active admin
      if (status === 'INACTIVE' || status === 'ARCHIVED') {
        const adminAccounts = await prisma.user.findMany({
          where: { id: { in: staffIds }, schoolId, role: 'SCHOOL_ADMIN' }
        });
        if (adminAccounts.length > 0) {
          const activeAdminsCount = await prisma.user.count({
            where: { schoolId, role: 'SCHOOL_ADMIN', status: 'ACTIVE', NOT: { id: { in: staffIds } } }
          });
          if (activeAdminsCount === 0) {
            return NextResponse.json({ error: 'Cannot deactivate the sole active School Administrator. Assign another Admin first.' }, { status: 400 });
          }
        }
      }

      const updated = await prisma.user.updateMany({
        where: { id: { in: staffIds }, schoolId },
        data: { status }
      });
      return NextResponse.json({ success: true, count: updated.count });
    }

    if (!staffId) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    // Verify ownership
    const staff = await prisma.user.findFirst({
      where: { id: staffId, schoolId }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff account not found within this school' }, { status: 404 });
    }

    // Prevent school admins from locking their own accounts
    if (staff.role === 'SCHOOL_ADMIN' && (status === 'INACTIVE' || status === 'ARCHIVED')) {
      const otherAdmins = await prisma.user.count({
        where: { schoolId, role: 'SCHOOL_ADMIN', status: 'ACTIVE', NOT: { id: staffId } }
      });
      if (otherAdmins === 0) {
        return NextResponse.json({ error: 'Cannot archive/deactivate the sole School Administrator. Assign another Admin first.' }, { status: 400 });
      }
    }

    // Update status
    const updated = await prisma.user.update({
      where: { id: staffId },
      data: { status }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Staff PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update staff credentials' }, { status: 500 });
  }
}

// 4. PATCH: Update Staff Details (firstName, lastName, email, phone, role, classTeacherArmId, subjectAssignments)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      staffId, schoolId, firstName, lastName, email, phone, passportPhoto,
      role, classTeacherArmId, subjectAssignments 
    } = body;

    if (!staffId || !schoolId) {
      return NextResponse.json({ error: 'Staff ID and School ID are required' }, { status: 400 });
    }

    // Verify ownership
    const staff = await prisma.user.findFirst({
      where: { id: staffId, schoolId }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff account not found within this school' }, { status: 404 });
    }

    // If email is changing, check for uniqueness globally
    if (email && email.toLowerCase().trim() !== staff.email.toLowerCase().trim()) {
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
      if (existing) {
        return NextResponse.json({ error: 'A user with this email address is already registered on the platform.' }, { status: 400 });
      }
    }

    // Execute updates inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update basic profile info & role
      const updatedUser = await tx.user.update({
        where: { id: staffId },
        data: {
          firstName: firstName !== undefined ? firstName.trim() : undefined,
          lastName: lastName !== undefined ? lastName.trim() : undefined,
          email: email !== undefined ? email.toLowerCase().trim() : undefined,
          phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
          role: role !== undefined ? role : undefined,
          passportPhoto: passportPhoto !== undefined ? (passportPhoto ? passportPhoto : null) : undefined,
        }
      });

      // 2. Manage Class Teacher Allocation
      if (role !== undefined || classTeacherArmId !== undefined) {
        // First, clear any class teacher mapping for this staff member
        await tx.arm.updateMany({
          where: { classTeacherId: staffId },
          data: { classTeacherId: null }
        });

        const targetRole = role !== undefined ? role : staff.role;
        const targetArmId = classTeacherArmId !== undefined ? classTeacherArmId : null;

        if (targetRole === 'CLASS_TEACHER' && targetArmId) {
          const arm = await tx.arm.findFirst({
            where: { id: targetArmId, schoolId }
          });
          if (arm) {
            await tx.arm.update({
              where: { id: targetArmId },
              data: { classTeacherId: staffId }
            });
          }
        }
      }

      // 3. Manage Subject & Arm Assignments (if subjectAssignments is provided)
      if (subjectAssignments !== undefined) {
        const currentTerm = await tx.term.findFirst({
          where: { schoolId, isCurrent: true }
        });

        if (currentTerm) {
          // Delete existing subject assignments for this teacher in current term
          await tx.subjectAssignment.deleteMany({
            where: { schoolId, teacherId: staffId, termId: currentTerm.id }
          });

          // Insert new ones
          if (Array.isArray(subjectAssignments) && subjectAssignments.length > 0) {
            for (const sa of subjectAssignments) {
              const { subjectId, armId } = sa;
              if (!subjectId || !armId) continue;

              const arm = await tx.arm.findFirst({
                where: { id: armId, schoolId }
              });
              if (!arm) continue;

              // Create assignment
              await tx.subjectAssignment.create({
                data: {
                  schoolId,
                  subjectId,
                  classId: arm.classId,
                  armId,
                  teacherId: staffId,
                  termId: currentTerm.id
                }
              });
            }
          }
        }
      }

      return updatedUser;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Staff PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update staff profile' }, { status: 500 });
  }
}

// 5. DELETE: Delete a Staff Account
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const schoolId = searchParams.get('schoolId');
    const staffIdsParam = searchParams.get('staffIds');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    if (staffIdsParam) {
      const staffIds = staffIdsParam.split(',').map(id => id.trim()).filter(Boolean);
      if (staffIds.length === 0) {
        return NextResponse.json({ error: 'No staff IDs provided' }, { status: 400 });
      }

      // Prevent deleting sole active admin
      const adminAccounts = await prisma.user.findMany({
        where: { id: { in: staffIds }, schoolId, role: 'SCHOOL_ADMIN' }
      });
      if (adminAccounts.length > 0) {
        const activeAdminsCount = await prisma.user.count({
          where: { schoolId, role: 'SCHOOL_ADMIN', status: 'ACTIVE', NOT: { id: { in: staffIds } } }
        });
        if (activeAdminsCount === 0) {
          return NextResponse.json({ error: 'Cannot delete the sole active School Administrator. Assign another Admin first.' }, { status: 400 });
        }
      }

      await prisma.user.deleteMany({
        where: { id: { in: staffIds }, schoolId }
      });

      return NextResponse.json({ success: true, message: `Successfully deleted ${staffIds.length} staff accounts.` });
    }

    if (!staffId) {
      return NextResponse.json({ error: 'Missing required parameters (staffId or staffIds)' }, { status: 400 });
    }

    // Verify ownership and fetch details
    const staff = await prisma.user.findFirst({
      where: { id: staffId, schoolId }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff account not found within this school' }, { status: 404 });
    }

    // Prevent school admins from deleting their own accounts (or the sole admin)
    if (staff.role === 'SCHOOL_ADMIN') {
      const otherAdmins = await prisma.user.count({
        where: { schoolId, role: 'SCHOOL_ADMIN', status: 'ACTIVE', NOT: { id: staffId } }
      });
      if (otherAdmins === 0) {
        return NextResponse.json({ error: 'Cannot delete the sole active School Administrator. Assign another Admin first.' }, { status: 400 });
      }
    }

    // Run delete
    await prisma.user.delete({
      where: { id: staffId }
    });

    return NextResponse.json({ success: true, message: 'Staff account successfully deleted.' });
  } catch (error: any) {
    console.error('Staff DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete staff account' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

