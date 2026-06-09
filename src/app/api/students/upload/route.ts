import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { generateUniqueUsername, generateTempPassword } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json().catch(() => ({}));
    const { schoolId, classId, armId, students } = body;

    if (!schoolId || !classId || !armId || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: 'Missing required upload parameters (schoolId, classId, armId, and students array)' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // Fetch the target Class and Arm details
    const targetClass = await prisma.class.findFirst({
      where: { id: classId, schoolId }
    });
    const targetArm = await prisma.arm.findFirst({
      where: { id: armId, classId, schoolId }
    });

    if (!targetClass || !targetArm) {
      return NextResponse.json({ error: 'Selected target class level or arm stream not found' }, { status: 404 });
    }

    const results = {
      successCount: 0,
      failCount: 0,
      failures: [] as { name: string; admissionNumber: string; error: string }[],
      createdStudents: [] as any[]
    };

    // Process students one by one inside a safe execution context
    for (const s of students) {
      const { firstName, lastName, middleName, admissionNumber, gender } = s;

      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const cleanMiddleName = middleName ? String(middleName).trim() : null;
      const cleanAdmissionNumber = String(admissionNumber || '').trim();
      let cleanGender = String(gender || 'MALE').trim().toUpperCase();
      if (cleanGender !== 'MALE' && cleanGender !== 'FEMALE') {
        cleanGender = 'MALE';
      }

      const displayName = cleanLastName ? `${cleanLastName}, ${cleanFirstName}` : cleanFirstName;

      if (!cleanFirstName || !cleanAdmissionNumber) {
        results.failCount++;
        results.failures.push({
          name: displayName || 'Unknown Student',
          admissionNumber: cleanAdmissionNumber || 'MISSING',
          error: 'First name and Admission number are required fields.'
        });
        continue;
      }

      try {
        // Check if admission number is already registered in the school
        const conflict = await prisma.student.findUnique({
          where: {
            schoolId_admissionNumber: {
              schoolId,
              admissionNumber: cleanAdmissionNumber
            }
          }
        });

        if (conflict) {
          results.failCount++;
          results.failures.push({
            name: displayName,
            admissionNumber: cleanAdmissionNumber,
            error: `Admission number "${cleanAdmissionNumber}" is already registered to ${conflict.lastName}, ${conflict.firstName}.`
          });
          continue;
        }

        // Auto-generate credentials for student user
        const tempPassword = generateTempPassword();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(tempPassword, salt);
        const username = await generateUniqueUsername(cleanLastName || 'student');
        const email = `${username}@student.local`;

        const newStudent = await prisma.$transaction(async (tx) => {
          // 1. Create student record
          const student = await tx.student.create({
            data: {
              schoolId,
              firstName: cleanFirstName,
              lastName: cleanLastName || 'Student',
              middleName: cleanMiddleName,
              admissionNumber: cleanAdmissionNumber,
              gender: cleanGender,
              classId,
              armId,
              status: 'ACTIVE'
            }
          });

          // 2. Create linked User credentials
          await tx.user.create({
            data: {
              schoolId,
              username,
              email,
              passwordHash,
              firstName: cleanFirstName,
              lastName: cleanLastName || 'Student',
              role: 'STUDENT',
              studentId: student.id,
              isFirstLogin: true,
              status: 'ACTIVE',
              isActive: true
            }
          });

          return student;
        });

        results.successCount++;
        results.createdStudents.push({
          id: newStudent.id,
          firstName: newStudent.firstName,
          lastName: newStudent.lastName,
          admissionNumber: newStudent.admissionNumber,
          username,
          temporaryPassword: tempPassword
        });
      } catch (err: any) {
        console.error('Error inserting uploaded student:', err);
        results.failCount++;
        results.failures.push({
          name: displayName,
          admissionNumber: cleanAdmissionNumber,
          error: err.message || 'Database transaction error.'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        successCount: results.successCount,
        failCount: results.failCount,
        failures: results.failures,
        createdStudents: results.createdStudents,
        className: targetClass.name,
        armName: targetArm.name
      }
    });

  } catch (error: any) {
    console.error('Excel Upload Students API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process student roster Excel upload' }, { status: error.status || 500 });
  }
}
export const dynamic = 'force-dynamic';
