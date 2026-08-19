import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { syncGuardiansToParents } from '@/lib/parent-sync';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json().catch(() => ({}));
    const { schoolId, classId, armId, students } = body;

    if (!schoolId || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: 'Missing required upload parameters (schoolId and students array)' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // ── 1. Pre-fetch all classes and arms ──────────────────────────────────────
    const allClasses = await prisma.class.findMany({
      where: { schoolId },
      include: { arms: true }
    });

    const classMapByName = new Map<string, any>();
    const classMapById = new Map<string, any>();
    const armMapByKey = new Map<string, any>(); // key: "classId|armName"
    allClasses.forEach(c => {
      classMapByName.set(c.name.trim().toLowerCase(), c);
      classMapById.set(c.id, c);
      c.arms.forEach((a: any) => armMapByKey.set(`${c.id}|${a.name.trim().toLowerCase()}`, a));
    });

    // ── 2. Capacity check ──────────────────────────────────────────────────────
    const schoolObj = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { maxStudents: true }
    });
    const currentActiveCount = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' }
    });
    const studentLimit = schoolObj?.maxStudents ?? 700;

    // ── 3. Fetch all existing admission numbers & usernames in ONE query ───────
    const existingStudents = await prisma.student.findMany({
      where: { schoolId },
      select: { admissionNumber: true }
    });
    const existingAdmNos = new Set(existingStudents.map((s: any) => s.admissionNumber));

    const existingUsers = await prisma.user.findMany({
      where: { schoolId },
      select: { username: true }
    });
    const existingUsernames = new Set(existingUsers.map((u: any) => u.username));

    // ── 4. Pre-hash password ONCE ─────────────────────────────────────────────
    const defaultPasswordHash = await bcrypt.hash('Student123', 10);
    const timestamp = Date.now().toString().slice(-5);

    // ── 5. Prepare batch data ─────────────────────────────────────────────────
    const studentRows: any[] = [];
    const userRows: any[] = [];
    const guardianRows: any[] = [];
    const failures: { name: string; admissionNumber: string; error: string }[] = [];
    const createdStudentsSummary: any[] = [];
    let skippedCount = 0;
    let newCount = 0;

    for (let i = 0; i < students.length; i++) {
      const s = students[i];

      const cleanFirstName = String(s.firstName || s.name || s.fullName || '').trim();
      const cleanLastName = String(s.lastName || s.surname || '').trim();
      const cleanAdmissionNumber = String(s.admissionNumber || s.admNo || s.regNo || '').trim();
      let cleanGender = String(s.gender || 'MALE').trim().toUpperCase();
      if (cleanGender !== 'MALE' && cleanGender !== 'FEMALE') cleanGender = 'MALE';

      const displayName = cleanLastName ? `${cleanLastName}, ${cleanFirstName}` : cleanFirstName;

      if (!cleanFirstName) {
        failures.push({ name: 'Unknown', admissionNumber: cleanAdmissionNumber || 'MISSING', error: 'First name is required.' });
        continue;
      }

      const admNo = cleanAdmissionNumber || `ADM-${timestamp}-${i}`;

      // Skip duplicates
      if (existingAdmNos.has(admNo)) {
        skippedCount++;
        continue;
      }

      // Resolve class
      let targetClass: any = null;
      if (s.className) targetClass = classMapByName.get(String(s.className).trim().toLowerCase());
      if (!targetClass && classId) targetClass = classMapById.get(classId);
      if (!targetClass && allClasses.length > 0) targetClass = allClasses[0];
      if (!targetClass) {
        failures.push({ name: displayName, admissionNumber: admNo, error: `Class '${s.className || 'default'}' not found.` });
        continue;
      }

      // Resolve arm
      let targetArm: any = null;
      if (s.armName) targetArm = armMapByKey.get(`${targetClass.id}|${String(s.armName).trim().toLowerCase()}`);
      if (!targetArm && armId) targetArm = targetClass.arms?.find((a: any) => a.id === armId);
      if (!targetArm) targetArm = targetClass.arms?.[0];
      if (!targetArm) {
        failures.push({ name: displayName, admissionNumber: admNo, error: `No arm found for class '${targetClass.name}'.` });
        continue;
      }

      // Generate unique username in memory
      const prefix = (cleanLastName || cleanFirstName).toLowerCase().replace(/[^a-z0-9]/g, '') || 'student';
      let username = `${prefix}${timestamp}${String(i).padStart(3, '0')}`;
      let attempt = 0;
      while (existingUsernames.has(username)) {
        username = `${prefix}${timestamp}${String(i + attempt * 1000).padStart(3, '0')}`;
        attempt++;
      }
      existingUsernames.add(username);
      existingAdmNos.add(admNo);

      const studentId = randomUUID();

      studentRows.push({
        id: studentId,
        schoolId,
        firstName: cleanFirstName,
        lastName: cleanLastName || 'Student',
        middleName: s.middleName ? String(s.middleName).trim() : null,
        preferredName: s.preferredName ? String(s.preferredName).trim() : null,
        admissionNumber: admNo,
        gender: cleanGender,
        dateOfBirth: s.dateOfBirth ? String(s.dateOfBirth).trim() : null,
        classId: targetClass.id,
        armId: targetArm.id,
        status: 'ACTIVE',
        category: s.category ? String(s.category).trim() : null,
        house: s.house ? String(s.house).trim() : null,
        nationality: s.nationality ? String(s.nationality).trim() : null,
        stateOfOrigin: s.stateOfOrigin ? String(s.stateOfOrigin).trim() : null,
        lga: s.lga ? String(s.lga).trim() : null,
        religion: s.religion ? String(s.religion).trim() : null,
        bloodGroup: s.bloodGroup ? String(s.bloodGroup).trim() : null,
        genotype: s.genotype ? String(s.genotype).trim() : null,
        address: s.address ? String(s.address).trim() : null,
        town: s.town ? String(s.town).trim() : null,
        state: s.state ? String(s.state).trim() : null,
        country: s.country ? String(s.country).trim() : null,
        phone: s.phone ? String(s.phone).trim() : null,
        email: s.email ? String(s.email).trim() : null,
        languages: s.languages ? String(s.languages).trim() : null,
        studentNotes: s.studentNotes ? String(s.studentNotes).trim() : null,
        admissionDate: s.admissionDate ? String(s.admissionDate).trim() : null,
        admissionType: s.admissionType ? String(s.admissionType).trim() : null,
        previousSchool: s.previousSchool ? String(s.previousSchool).trim() : null,
      });

      userRows.push({
        schoolId,
        username,
        email: `${username}@student.local`,
        passwordHash: defaultPasswordHash,
        firstName: cleanFirstName,
        lastName: cleanLastName || 'Student',
        role: 'STUDENT',
        studentId,
        isFirstLogin: true,
        status: 'ACTIVE',
        isActive: true,
      });

      if (s.guardianFirstName || s.guardianLastName || s.guardianPhone) {
        const gRel = String(s.guardianRelationship || 'GUARDIAN').trim().toUpperCase();
        guardianRows.push({
          schoolId,
          studentId,
          firstName: String(s.guardianFirstName || 'Guardian').trim(),
          lastName: String(s.guardianLastName || cleanLastName || 'Guardian').trim(),
          relationship: ['FATHER', 'MOTHER', 'GUARDIAN', 'EMERGENCY'].includes(gRel) ? gRel : 'GUARDIAN',
          phone: s.guardianPhone ? String(s.guardianPhone).trim() : null,
          email: s.guardianEmail ? String(s.guardianEmail).trim() : null,
          dateOfBirth: s.guardianDateOfBirth ? String(s.guardianDateOfBirth).trim() : null,
          occupation: s.guardianOccupation ? String(s.guardianOccupation).trim() : null,
          address: s.guardianAddress ? String(s.guardianAddress).trim() : null,
          isPrimary: true,
          isBillingContact: true,
          isEmergencyContact: true,
          isNotificationRecipient: true,
        });
      }

      newCount++;
      createdStudentsSummary.push({
        id: studentId,
        firstName: cleanFirstName,
        lastName: cleanLastName || 'Student',
        admissionNumber: admNo,
        username,
        temporaryPassword: 'Student123',
      });
    }

    // Capacity check against prepared new students
    if (currentActiveCount + newCount > studentLimit) {
      return NextResponse.json({
        error: `Student limit reached. Adding ${newCount} new students would exceed your capacity of ${studentLimit} (current: ${currentActiveCount}).`,
      }, { status: 403 });
    }

    // ── 6. Bulk insert ALL at once using createMany ────────────────────────────
    if (studentRows.length > 0) {
      await prisma.$transaction([
        prisma.student.createMany({ data: studentRows, skipDuplicates: true }),
        prisma.user.createMany({ data: userRows, skipDuplicates: true }),
      ]);

      if (guardianRows.length > 0) {
        await prisma.studentGuardian.createMany({ data: guardianRows, skipDuplicates: true });
      }
    }

    // ── 7. Auto-sync guardians to parent accounts ──────────────────────────────
    try {
      await syncGuardiansToParents(schoolId);
    } catch (syncErr) {
      console.warn('Guardian sync warning (non-fatal):', syncErr);
    }

    return NextResponse.json({
      success: true,
      created: newCount,
      skipped: skippedCount,
      data: {
        successCount: newCount,
        failCount: failures.length,
        failures,
        createdStudents: createdStudentsSummary,
      }
    });

  } catch (error: any) {
    console.error('Excel Upload Students API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process student roster Excel upload' }, { status: error.status || 500 });
  }
}

export const dynamic = 'force-dynamic';
