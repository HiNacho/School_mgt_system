// Prisma Seeding Script
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password', salt);

  // --- 1. CLEAN EXISTING DATABASE ---
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.reportCardComment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.score.deleteMany();
  await prisma.subjectAssignment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.arm.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.gradingRule.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // --- 2. CREATE TENANT SCHOOLS ---
  const greenwood = await prisma.school.create({
    data: {
      name: 'Nacho Secondary Academy',
      slug: 'nacho-secondary',
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop',
      address: 'Plot 12, Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
      phone: '+234 803 111 2222',
      email: 'info@nacho.edu.ng',
      gradingType: 'SECONDARY', // uses A1 - F9
    },
  });

  const lagosExcel = await prisma.school.create({
    data: {
      name: 'Lagos Excel Primary School',
      slug: 'lagos-excel-primary',
      logoUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=100&auto=format&fit=crop',
      address: '45, Toyin Street, Ikeja, Lagos, Nigeria',
      phone: '+234 805 555 4444',
      email: 'admin@lagosexcel.edu.ng',
      gradingType: 'PRIMARY', // uses A - D
    },
  });

  console.log('🏫 Created Schools (Tenants):', { greenwood: greenwood.name, lagosExcel: lagosExcel.name });

  // --- 3. CREATE GRADING SCALES ---
  // Greenwood (Secondary Scale: A1 - F9)
  const secondaryRules = [
    { minScore: 75, maxScore: 100, grade: 'A1', interpretation: 'Excellent' },
    { minScore: 70, maxScore: 74.9, grade: 'B2', interpretation: 'Very Good' },
    { minScore: 65, maxScore: 69.9, grade: 'B3', interpretation: 'Good' },
    { minScore: 60, maxScore: 64.9, grade: 'C4', interpretation: 'Credit' },
    { minScore: 55, maxScore: 59.9, grade: 'C5', interpretation: 'Credit' },
    { minScore: 50, maxScore: 54.9, grade: 'C6', interpretation: 'Credit' },
    { minScore: 45, maxScore: 49.9, grade: 'D7', interpretation: 'Pass' },
    { minScore: 40, maxScore: 44.9, grade: 'E8', interpretation: 'Pass' },
    { minScore: 0, maxScore: 39.9, grade: 'F9', interpretation: 'Fail' },
  ];

  for (const r of secondaryRules) {
    await prisma.gradingRule.create({
      data: {
        schoolId: greenwood.id,
        minScore: r.minScore,
        maxScore: r.maxScore,
        grade: r.grade,
        interpretation: r.interpretation,
      },
    });
  }

  // Lagos Excel (Primary Scale: A - D)
  const primaryRules = [
    { minScore: 80, maxScore: 100, grade: 'A', interpretation: 'Excellent' },
    { minScore: 60, maxScore: 79.9, grade: 'B', interpretation: 'Good' },
    { minScore: 40, maxScore: 59.9, grade: 'C', interpretation: 'Pass' },
    { minScore: 0, maxScore: 39.9, grade: 'D', interpretation: 'Needs Improvement' },
  ];

  for (const r of primaryRules) {
    await prisma.gradingRule.create({
      data: {
        schoolId: lagosExcel.id,
        minScore: r.minScore,
        maxScore: r.maxScore,
        grade: r.grade,
        interpretation: r.interpretation,
      },
    });
  }

  console.log('📈 Configured School-Specific Grading Scales.');

  // --- 4. CREATE SESSIONS & TERMS ---
  const sessionGreenwood = await prisma.academicSession.create({
    data: {
      schoolId: greenwood.id,
      name: '2025/2026',
      isCurrent: true,
    },
  });

  const sessionLagos = await prisma.academicSession.create({
    data: {
      schoolId: lagosExcel.id,
      name: '2025/2026',
      isCurrent: true,
    },
  });

  const termsList = ['First Term', 'Second Term', 'Third Term'];
  let termGreenwoodId = '';
  let termLagosId = '';

  for (let i = 0; i < termsList.length; i++) {
    const tg = await prisma.term.create({
      data: {
        schoolId: greenwood.id,
        sessionId: sessionGreenwood.id,
        name: termsList[i],
        isCurrent: i === 0, // First Term is current
      },
    });
    if (i === 0) termGreenwoodId = tg.id;

    const tl = await prisma.term.create({
      data: {
        schoolId: lagosExcel.id,
        sessionId: sessionLagos.id,
        name: termsList[i],
        isCurrent: i === 0,
      },
    });
    if (i === 0) termLagosId = tl.id;
  }

  console.log('📅 Seeded Sessions and Terms.');

  // --- 5. CREATE SUBJECTS ---
  const subjectsData = [
    { name: 'Mathematics', code: 'MTH', category: 'COMPULSORY' },
    { name: 'English Language', code: 'ENG', category: 'COMPULSORY' },
    { name: 'Basic Science', code: 'BSC', category: 'COMPULSORY' },
    { name: 'Civic Education', code: 'CVE', category: 'COMPULSORY' },
    { name: 'Agricultural Science', code: 'AGR', category: 'ELECTIVE' },
  ];

  const greenwoodSubjects = [];
  const lagosSubjects = [];

  for (const s of subjectsData) {
    const sg = await prisma.subject.create({
      data: { schoolId: greenwood.id, ...s },
    });
    greenwoodSubjects.push(sg);

    const sl = await prisma.subject.create({
      data: { schoolId: lagosExcel.id, ...s },
    });
    lagosSubjects.push(sl);
  }

  console.log('📚 Initialized Subject Registers.');

  // --- 6. CREATE USERS (STAFF CREDENTIALS WITH BYPASS ENTRANCE) ---
  // Greenwood Secondary Accounts
  const adminGreenwood = await prisma.user.create({
    data: {
      schoolId: greenwood.id,
      username: 'schooladmin',
      email: 'admin@nacho.com',
      passwordHash,
      firstName: 'Kola',
      lastName: 'Adekunle',
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  const classTeacherGreenwood = await prisma.user.create({
    data: {
      schoolId: greenwood.id,
      username: 'classteacher',
      email: 'classteacher@nacho.com',
      passwordHash,
      firstName: 'Apeh',
      lastName: 'Solomon',
      title: 'Mr.',
      role: 'CLASS_TEACHER',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  const subjectTeacherGreenwood = await prisma.user.create({
    data: {
      schoolId: greenwood.id,
      username: 'subjectteacher',
      email: 'subjectteacher@nacho.com',
      passwordHash,
      firstName: 'Tunde',
      lastName: 'Bello',
      title: 'Mr.',
      role: 'SUBJECT_TEACHER',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  // Lagos Primary Accounts
  const adminLagos = await prisma.user.create({
    data: {
      schoolId: lagosExcel.id,
      username: 'lagosadmin',
      email: 'admin@lagosexcel.com',
      passwordHash,
      firstName: 'Amina',
      lastName: 'Usman',
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  // Platform-wide Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      schoolId: null, // Platform-wide global override
      username: 'superadmin',
      email: 'superadmin@system.com',
      passwordHash,
      firstName: 'Archibong',
      lastName: 'Bassey',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  console.log('👤 Configured Staff Accounts (RBAC enabled).');

  // --- 7. CREATE CLASSES & ARMS ---
  const jss1 = await prisma.class.create({
    data: { schoolId: greenwood.id, name: 'JSS 1' },
  });

  const jss1a = await prisma.arm.create({
    data: {
      schoolId: greenwood.id,
      classId: jss1.id,
      name: 'A',
      classTeacherId: classTeacherGreenwood.id, // Chidinma Okonkwo is JSS 1A Teacher
    },
  });

  const jss1b = await prisma.arm.create({
    data: {
      schoolId: greenwood.id,
      classId: jss1.id,
      name: 'B',
      classTeacherId: null,
    },
  });

  // Primary 1 for Lagos Excel
  const pri1 = await prisma.class.create({
    data: { schoolId: lagosExcel.id, name: 'Primary 1' },
  });

  const pri1a = await prisma.arm.create({
    data: {
      schoolId: lagosExcel.id,
      classId: pri1.id,
      name: 'A',
      classTeacherId: null,
    },
  });

  console.log('🏫 Registered Classes & Class Arms.');

  // --- 8. ASSIGN SUBJECT TEACHERS ---
  // Tunde Bello teaches Mathematics, English in JSS 1A
  const mathSubject = greenwoodSubjects.find(s => s.code === 'MTH')!;
  const engSubject = greenwoodSubjects.find(s => s.code === 'ENG')!;

  await prisma.subjectAssignment.create({
    data: {
      schoolId: greenwood.id,
      subjectId: mathSubject.id,
      classId: jss1.id,
      armId: jss1a.id,
      teacherId: subjectTeacherGreenwood.id,
      termId: termGreenwoodId,
    },
  });

  await prisma.subjectAssignment.create({
    data: {
      schoolId: greenwood.id,
      subjectId: engSubject.id,
      classId: jss1.id,
      armId: jss1a.id,
      teacherId: subjectTeacherGreenwood.id,
      termId: termGreenwoodId,
    },
  });

  console.log('🔑 Subject-Teacher Assignments Complete.');

  // --- 9. SEED STUDENTS FROM EXCEL SHEETS OR FALLBACKS ---
  const dataDir = path.join(process.cwd(), 'data');
  const jss1aPath = path.join(dataDir, 'jss_1a_students.xlsx');
  const jss1bPath = path.join(dataDir, 'jss_1b_students.xlsx');

  let seededCount = 0;

  // JSS 1A Seeder
  if (fs.existsSync(jss1aPath)) {
    console.log(`📊 Found JSS 1A student sheet. Parsing...`);
    const workbook = XLSX.readFile(jss1aPath);
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

    let i = 0;
    for (const r of rawRows) {
      const admissionNumber = String(r['Admission Number'] || r['AdmissionNo'] || '').trim();
      const fullName = String(r['Student Name'] || r['Name'] || '').trim();
      let gender = String(r['Gender'] || 'MALE').trim().toUpperCase();
      if (gender !== 'MALE' && gender !== 'FEMALE') gender = 'MALE';

      if (!admissionNumber || !fullName) continue;

      // Extract first/last name
      const nameParts = fullName.split(',');
      let lastName = nameParts[0]?.trim() || '';
      let firstName = nameParts[1]?.trim() || '';

      if (firstName === '') {
        const spaceParts = fullName.split(' ');
        firstName = spaceParts[0]?.trim() || '';
        lastName = spaceParts.slice(1).join(' ')?.trim() || 'Student';
      }

      await prisma.student.create({
        data: {
          schoolId: greenwood.id,
          firstName,
          lastName,
          admissionNumber,
          gender,
          classId: jss1.id,
          armId: jss1a.id,
          status: 'ACTIVE',
          feesPaid: i % 3 !== 0,
        },
      });
      seededCount++;
      i++;
    }
  } else {
    // JSS 1A Fallback seeding
    console.log(`⚠️ JSS 1A sheet not found. Loading fallbacks...`);
    const fallbackStudents = [
      { firstName: 'Emeka', lastName: 'Nwachukwu', admissionNumber: 'GW-2025-001', gender: 'MALE' },
      { firstName: 'Yetunde', lastName: 'Alabi', admissionNumber: 'GW-2025-002', gender: 'FEMALE' },
      { firstName: 'Zainab', lastName: 'Bello', admissionNumber: 'GW-2025-003', gender: 'FEMALE' },
      { firstName: 'David', lastName: 'Okeke', admissionNumber: 'GW-2025-004', gender: 'MALE' },
      { firstName: 'Blessing', lastName: 'Effiong', admissionNumber: 'GW-2025-005', gender: 'FEMALE' },
    ];
    for (let idx = 0; idx < fallbackStudents.length; idx++) {
      const s = fallbackStudents[idx];
      await prisma.student.create({
        data: {
          schoolId: greenwood.id,
          classId: jss1.id,
          armId: jss1a.id,
          status: 'ACTIVE',
          feesPaid: idx % 3 !== 0,
          ...s,
        },
      });
      seededCount++;
    }
  }

  // JSS 1B Seeder
  if (fs.existsSync(jss1bPath)) {
    console.log(`📊 Found JSS 1B student sheet. Parsing...`);
    const workbook = XLSX.readFile(jss1bPath);
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

    let i = 0;
    for (const r of rawRows) {
      const admissionNumber = String(r['Admission Number'] || r['AdmissionNo'] || '').trim();
      const fullName = String(r['Student Name'] || r['Name'] || '').trim();
      let gender = String(r['Gender'] || 'MALE').trim().toUpperCase();
      if (gender !== 'MALE' && gender !== 'FEMALE') gender = 'MALE';

      if (!admissionNumber || !fullName) continue;

      const nameParts = fullName.split(',');
      let lastName = nameParts[0]?.trim() || '';
      let firstName = nameParts[1]?.trim() || '';

      if (firstName === '') {
        const spaceParts = fullName.split(' ');
        firstName = spaceParts[0]?.trim() || '';
        lastName = spaceParts.slice(1).join(' ')?.trim() || 'Student';
      }

      await prisma.student.create({
        data: {
          schoolId: greenwood.id,
          firstName,
          lastName,
          admissionNumber,
          gender,
          classId: jss1.id,
          armId: jss1b.id,
          status: 'ACTIVE',
          feesPaid: i % 3 !== 0,
        },
      });
      seededCount++;
      i++;
    }
  }

  // Seed Primary 1A Students (Lagos Excel)
  const lagosMockStudents = [
    { firstName: 'Timi', lastName: 'George', admissionNumber: 'LE-2025-101', gender: 'MALE' },
    { firstName: 'Fatima', lastName: 'Aliyu', admissionNumber: 'LE-2025-102', gender: 'FEMALE' },
    { firstName: 'Kemi', lastName: 'Oshodi', admissionNumber: 'LE-2025-103', gender: 'FEMALE' },
  ];

  for (let idx = 0; idx < lagosMockStudents.length; idx++) {
    const s = lagosMockStudents[idx];
    await prisma.student.create({
      data: {
        schoolId: lagosExcel.id,
        classId: pri1.id,
        armId: pri1a.id,
        status: 'ACTIVE',
        feesPaid: idx % 3 !== 0,
        ...s,
      },
    });
    seededCount++;
  }

  console.log(`👨🎓 Seeding complete. Successfully registered ${seededCount} students in database.`);

  // --- 10. CREATE PARENTS AND LINK TO STUDENTS ---
  console.log('🌱 Seeding Parents & Parent Logins...');
  // Parent 1 (Greenwood)
  const parentGreenwood = await prisma.parent.create({
    data: {
      schoolId: greenwood.id,
      email: 'parent@nacho.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Bennett',
      phone: '456-456-789',
      address: '988 Fir Blvd, Stonehill',
      status: 'ACTIVE',
    },
  });

  const parentGreenwoodUser = await prisma.user.create({
    data: {
      schoolId: greenwood.id,
      username: 'nacho_parent',
      email: 'parent@nacho.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Bennett',
      role: 'PARENT',
      parentId: parentGreenwood.id,
      isFirstLogin: false,
      isActive: true,
      status: 'ACTIVE'
    },
  });

  // Parent 2 (Lagos Excel)
  const parentLagos = await prisma.parent.create({
    data: {
      schoolId: lagosExcel.id,
      email: 'parent@lagosexcel.com',
      passwordHash,
      firstName: 'Caleb',
      lastName: 'Brooks',
      phone: '563-325-245',
      address: '877 Willow Ave, Westfield',
      status: 'ACTIVE',
    },
  });

  const parentLagosUser = await prisma.user.create({
    data: {
      schoolId: lagosExcel.id,
      username: 'lagos_parent',
      email: 'parent@lagosexcel.com',
      passwordHash,
      firstName: 'Caleb',
      lastName: 'Brooks',
      role: 'PARENT',
      parentId: parentLagos.id,
      isFirstLogin: false,
      isActive: true,
      status: 'ACTIVE'
    },
  });

  // Link Greenwood students to Alice Bennett parent
  const greenwoodStudents = await prisma.student.findMany({
    where: { schoolId: greenwood.id },
    take: 3,
  });

  for (const stud of greenwoodStudents) {
    await prisma.student.update({
      where: { id: stud.id },
      data: { 
        parentId: parentGreenwood.id,
        passportPhoto: stud.gender === 'FEMALE' 
          ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop'
          : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop'
      },
    });
  }

  // Create login user for the first student (Zainab Bello)
  const zainab = await prisma.student.findFirst({
    where: { schoolId: greenwood.id, firstName: 'Zainab' }
  });

  if (zainab) {
    await prisma.user.create({
      data: {
        schoolId: greenwood.id,
        username: 'nacho_student',
        email: 'student@nacho.com',
        passwordHash,
        firstName: zainab.firstName,
        lastName: zainab.lastName,
        role: 'STUDENT',
        studentId: zainab.id,
        isFirstLogin: false,
        isActive: true,
        status: 'ACTIVE'
      }
    });
  }

  // Link Lagos Excel students to Caleb Brooks parent
  const lagosStudents = await prisma.student.findMany({
    where: { schoolId: lagosExcel.id },
  });

  for (const stud of lagosStudents) {
    await prisma.student.update({
      where: { id: stud.id },
      data: { 
        parentId: parentLagos.id,
        passportPhoto: stud.gender === 'FEMALE'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop'
      },
    });
  }

  // Create login user for the first lagos student (Timi George)
  const timi = await prisma.student.findFirst({
    where: { schoolId: lagosExcel.id, firstName: 'Timi' }
  });

  if (timi) {
    await prisma.user.create({
      data: {
        schoolId: lagosExcel.id,
        username: 'lagos_student',
        email: 'student@lagosexcel.com',
        passwordHash,
        firstName: timi.firstName,
        lastName: timi.lastName,
        role: 'STUDENT',
        studentId: timi.id,
        isFirstLogin: false,
        isActive: true,
        status: 'ACTIVE'
      }
    });
  }

  console.log('📅 Seeding Events & Announcements...');
  // Seed Events (Sept 2024 style, or relative to current date)
  const today = new Date();
  const yearStr = today.getFullYear();
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');

  const mockEvents = [
    { title: 'Book Fair', description: 'Browse and purchase books at our annual school Book Fair.', date: `${yearStr}-${monthStr}-16`, time: '08:00 - 10:00' },
    { title: 'Sports Day', description: 'A fun-filled day of athletic events and team competitions.', date: `${yearStr}-${monthStr}-17`, time: '10:00 - 12:00' },
    { title: 'Art Exhibition', description: 'Display your artwork for the school community to admire.', date: `${yearStr}-${monthStr}-18`, time: '12:00 - 14:00' },
  ];

  for (const ev of mockEvents) {
    await prisma.event.create({
      data: {
        schoolId: greenwood.id,
        ...ev,
      },
    });
    await prisma.event.create({
      data: {
        schoolId: lagosExcel.id,
        ...ev,
      },
    });
  }

  const mockAnnouncements = [
    { title: 'Picture Day Reminder', content: 'School Picture Day is tomorrow! Don\'t forget to wear your full uniform and bring your best smile.', date: `${yearStr}-${monthStr}-16` },
    { title: 'Book Fair Opening', content: 'The annual Book Fair will open this Thursday. Stop by the library to explore a wide selection of books.', date: `${yearStr}-${monthStr}-16` },
  ];

  for (const ann of mockAnnouncements) {
    await prisma.announcement.create({
      data: {
        schoolId: greenwood.id,
        ...ann,
      },
    });
    await prisma.announcement.create({
      data: {
        schoolId: lagosExcel.id,
        ...ann,
      },
    });
  }

  console.log('🚀 Result Automation System Seeded Perfectly!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
