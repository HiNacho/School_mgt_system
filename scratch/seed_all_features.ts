// Master Database Seeder - All Features Testing Setup
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const prisma = new PrismaClient();
const schoolId = 'c47f0190-50e4-4a14-9668-a393fbf6473e'; // Greenwood Secondary Academy

async function main() {
  console.log('🌱 Initializing universal feature testing seeder for Greenwood Secondary Academy...');

  // --- 1. CLEAN PREVIOUS RECORDS ---
  console.log('🧹 Wiping old database entries...');

  await prisma.subjectAssignment.deleteMany({ where: { schoolId } });
  await prisma.score.deleteMany({ where: { schoolId } });
  await prisma.scoreSubmission.deleteMany({ where: { schoolId } });
  await prisma.attendance.deleteMany({ where: { schoolId } });
  await prisma.dailyAttendance.deleteMany({ where: { schoolId } });
  await prisma.reportCardComment.deleteMany({ where: { schoolId } });
  await prisma.student.deleteMany({ where: { schoolId } });
  await prisma.parent.deleteMany({ where: { schoolId } });
  
  // Unlink class teachers from arms
  await prisma.arm.updateMany({
    where: { schoolId },
    data: { classTeacherId: null }
  });
  
  await prisma.arm.deleteMany({ where: { schoolId } });
  await prisma.class.deleteMany({ where: { schoolId } });


  // Delete previous subject/class teachers & parents
  await prisma.user.deleteMany({
    where: {
      schoolId,
      role: { in: ['SUBJECT_TEACHER', 'CLASS_TEACHER', 'PARENT'] }
    }
  });

  await prisma.subject.deleteMany({ where: { schoolId } });
  await prisma.gradingRule.deleteMany({ where: { schoolId } });
  await prisma.term.deleteMany({ where: { schoolId } });
  await prisma.academicSession.deleteMany({ where: { schoolId } });
  await prisma.event.deleteMany({ where: { schoolId } });
  await prisma.announcement.deleteMany({ where: { schoolId } });

  // Make sure Greenwood school exists or upsert it
  const school = await prisma.school.upsert({
    where: { id: schoolId },
    update: {
      name: 'Greenwood Secondary Academy',
      slug: 'greenwood-secondary',
      gradingType: 'SECONDARY'
    },
    create: {
      id: schoolId,
      name: 'Greenwood Secondary Academy',
      slug: 'greenwood-secondary',
      gradingType: 'SECONDARY'
    }
  });
  console.log(`🏫 Registered School Tenant: ${school.name}`);

  // --- 2. SEED ACADEMIC SESSION & TERMS ---
  const session = await prisma.academicSession.create({
    data: {
      schoolId,
      name: '2025/2026',
      isCurrent: true
    }
  });

  const term = await prisma.term.create({
    data: {
      schoolId,
      sessionId: session.id,
      name: 'First Term',
      isCurrent: true
    }
  });
  console.log(`📅 Created Session 2025/2026 & Term: First Term`);

  // --- 3. SEED WEST AFRICAN GRADING RULES (A1 - F9) ---
  const rules = [
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

  for (const r of rules) {
    await prisma.gradingRule.create({
      data: {
        schoolId,
        minScore: r.minScore,
        maxScore: r.maxScore,
        grade: r.grade,
        interpretation: r.interpretation
      }
    });
  }
  console.log('📈 Seeded WAEC Secondary Grading Rules.');

  // --- 4. SEED 10 SUBJECTS WITH CURATED COLORS & MATRIX CODES ---
  const subjectsData = [
    { name: 'Mathematics', code: 'MTH', category: 'COMPULSORY', color: 'blue' },
    { name: 'English Language', code: 'ENG', category: 'COMPULSORY', color: 'green' },
    { name: 'Computer Studies', code: 'CMP', category: 'COMPULSORY', color: 'emerald' },
    { name: 'Basic Science', code: 'SCI', category: 'COMPULSORY', color: 'purple' },
    { name: 'Introductory Technology', code: 'INT', category: 'COMPULSORY', color: 'orange' },
    { name: 'Home Economics', code: 'HEC', category: 'COMPULSORY', color: 'rose' },
    { name: 'Christian Religious Knowledge', code: 'CRK', category: 'COMPULSORY', color: 'indigo' },
    { name: 'Literature-in-English', code: 'LIT', category: 'COMPULSORY', color: 'teal' },
    { name: 'Social Studies', code: 'SOS', category: 'COMPULSORY', color: 'amber' },
    { name: 'Agricultural Science', code: 'AGR', category: 'COMPULSORY', color: 'blue' },
  ];

  const subjects: Record<string, any> = {};
  for (const s of subjectsData) {
    const sub = await prisma.subject.create({
      data: {
        schoolId,
        name: s.name,
        code: s.code,
        category: s.category,
        color: s.color,
        restrictions: JSON.stringify({
          blockedPeriods: s.code === 'AGR' ? [5, 6] : [], // AGR blocked afternoons
          preferredPeriods: s.code === 'MTH' || s.code === 'ENG' ? [1, 2] : [] // core preferred mornings
        })
      }
    });
    subjects[s.code] = sub;
  }
  console.log(`📚 Registered ${subjectsData.length} Subjects.`);

  // --- 5. SEED 16 STAFF MEMBERS (PRIMARY TEACHERS & LEVEL HELPERS) ---
  const teachersList = [
    { email: 'fidelis@greenwood.com', firstName: 'Mr. Fidelis', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'cordelia@greenwood.com', firstName: 'Mrs. Cordelia', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'apeh@greenwood.com', firstName: 'Mr. Apeh', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'ode@greenwood.com', firstName: 'Mr. Ode', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'gynag@greenwood.com', firstName: 'Mr. Gynag', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'rita@greenwood.com', firstName: 'Mrs. Rita', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'vera@greenwood.com', firstName: 'Mrs. Vera', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'cynthia@greenwood.com', firstName: 'Mrs. Cynthia', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'suwa@greenwood.com', firstName: 'Mr. Suwa', lastName: 'I', role: 'CLASS_TEACHER' },
    { email: 'mohammed@greenwood.com', firstName: 'Mrs. Mohammed', lastName: 'I', role: 'CLASS_TEACHER' },

    // Helpers
    { email: 'fidelis2@greenwood.com', firstName: 'Mr. Fidelis', lastName: 'II', role: 'SUBJECT_TEACHER' },
    { email: 'fidelis3@greenwood.com', firstName: 'Mr. Fidelis', lastName: 'III', role: 'SUBJECT_TEACHER' },
    { email: 'cordelia2@greenwood.com', firstName: 'Mrs. Cordelia', lastName: 'II', role: 'SUBJECT_TEACHER' },
    { email: 'cordelia3@greenwood.com', firstName: 'Mrs. Cordelia', lastName: 'III', role: 'SUBJECT_TEACHER' },
    { email: 'ode2@greenwood.com', firstName: 'Mr. Ode', lastName: 'II', role: 'SUBJECT_TEACHER' },
    { email: 'ode3@greenwood.com', firstName: 'Mr. Ode', lastName: 'III', role: 'SUBJECT_TEACHER' }
  ];

  const teachers: Record<string, any> = {};
  for (const t of teachersList) {
    const user = await prisma.user.create({
      data: {
        schoolId,
        username: t.email,
        email: t.email,
        passwordHash: 'password', // Plain match
        firstName: t.firstName,
        lastName: t.lastName,
        role: t.role,
        status: 'ACTIVE'
      }
    });


    teachers[t.email] = user;
  }
  console.log(`👤 Created ${teachersList.length} Teachers with Profiles.`);

  // --- 6. SEED CLASSES AND ARMS (JSS 1A TO JSS 3C) ---
  const classLevels = ['JSS 1', 'JSS 2', 'JSS 3'];
  const armsList = ['A', 'B', 'C'];
  const arms: any[] = [];

  const classTeacherEmails = [
    'fidelis@greenwood.com', 'cordelia@greenwood.com', 'apeh@greenwood.com',
    'ode@greenwood.com', 'gynag@greenwood.com', 'suwa@greenwood.com',
    'rita@greenwood.com', 'vera@greenwood.com', 'mohammed@greenwood.com'
  ];

  let teachIdx = 0;

  for (const lvl of classLevels) {
    const cls = await prisma.class.create({
      data: { schoolId, name: lvl }
    });

    for (const armLetter of armsList) {
      const armTeacher = teachers[classTeacherEmails[teachIdx]];
      const arm = await prisma.arm.create({
        data: {
          schoolId,
          classId: cls.id,
          name: armLetter,
          classTeacherId: armTeacher ? armTeacher.id : null
        },
        include: { class: true }
      });
      arms.push(arm);
      teachIdx++;
    }
  }
  console.log(`🏫 Created 3 Classes & 9 Arms JSS1A - JSS3C.`);

  // --- 7. CONFIGURE ALLOCATIONS & RESTRICTION MATRIX ENGINE RULES ---
  console.log('📌 Linking SubjectAssignments & TimetableRequirements...');
  for (const arm of arms) {
    const lvlName = arm.class.name;
    
    // Distribute core teachers across levels
    let mathsTeacher = teachers['fidelis@greenwood.com'];
    let englishTeacher = teachers['cordelia@greenwood.com'];
    let scienceTeacher = teachers['ode@greenwood.com'];

    if (lvlName === 'JSS 2') {
      mathsTeacher = teachers['fidelis2@greenwood.com'];
      englishTeacher = teachers['cordelia2@greenwood.com'];
      scienceTeacher = teachers['ode2@greenwood.com'];
    } else if (lvlName === 'JSS 3') {
      mathsTeacher = teachers['fidelis3@greenwood.com'];
      englishTeacher = teachers['cordelia3@greenwood.com'];
      scienceTeacher = teachers['ode3@greenwood.com'];
    }

    const allocations = [
      { code: 'MTH', teacher: mathsTeacher, periods: 5, double: true },
      { code: 'ENG', teacher: englishTeacher, periods: 5, double: true },
      { code: 'SCI', teacher: scienceTeacher, periods: 4, double: false },
      { code: 'CMP', teacher: teachers['apeh@greenwood.com'], periods: 3, double: true },
      { code: 'INT', teacher: teachers['gynag@greenwood.com'], periods: 3, double: false },
      { code: 'SOS', teacher: teachers['suwa@greenwood.com'], periods: 3, double: false },
      { code: 'AGR', teacher: teachers['mohammed@greenwood.com'], periods: 2, double: false },
      { code: 'HEC', teacher: teachers['rita@greenwood.com'], periods: 2, double: false },
      { code: 'CRK', teacher: teachers['vera@greenwood.com'], periods: 2, double: false },
      { code: 'LIT', teacher: teachers['cynthia@greenwood.com'], periods: 1, double: false },
    ];

    for (const alloc of allocations) {
      const subject = subjects[alloc.code];

      // SubjectAssignment
      await prisma.subjectAssignment.create({
        data: {
          schoolId,
          subjectId: subject.id,
          classId: arm.classId,
          armId: arm.id,
          teacherId: alloc.teacher.id,
          termId: term.id
        }
      });


    }
  }
  console.log('🔑 Seeded allocations and quotas.');

  // --- 8. SEED STUDENTS AND PARENTS ---
  console.log('👨‍🎓 Seeding Student and Parent records...');
  
  const studentNames = [
    { first: 'Emeka', last: 'Okonkwo', gender: 'MALE' },
    { first: 'Zainab', last: 'Adewale', gender: 'FEMALE' },
    { first: 'Chidi', last: 'Eze', gender: 'MALE' },
    { first: 'Blessing', last: 'Ojo', gender: 'FEMALE' },
    { first: 'Tunde', last: 'Balogun', gender: 'MALE' }
  ];

  let studentIdx = 101;
  const allCreatedStudents: any[] = [];

  for (const arm of arms) {
    for (let i = 0; i < studentNames.length; i++) {
      const name = studentNames[i];
      const admissionNumber = `GW-2025-${studentIdx}`;
      
      const stud = await prisma.student.create({
        data: {
          schoolId,
          classId: arm.classId,
          armId: arm.id,
          firstName: name.first,
          lastName: name.last,
          gender: name.gender,
          admissionNumber,
          status: 'ACTIVE',
          feesPaid: i % 2 === 0,
          passportPhoto: name.gender === 'FEMALE'
            ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop'
        }
      });
      allCreatedStudents.push(stud);
      studentIdx++;
    }
  }
  console.log(`👨‍🎓 Seeded ${allCreatedStudents.length} Students across all arms.`);

  // Link a parent to the JSS1A students
  const parent = await prisma.parent.create({
    data: {
      schoolId,
      email: 'parent@greenwood.com',
      passwordHash: 'password',
      firstName: 'Alice',
      lastName: 'Okonkwo',
      status: 'ACTIVE'
    }
  });

  await prisma.user.create({
    data: {
      schoolId,
      username: 'parent@greenwood.com',
      email: 'parent@greenwood.com',
      passwordHash: 'password',
      firstName: 'Alice',
      lastName: 'Okonkwo',
      role: 'PARENT',
      parentId: parent.id
    }
  });

  // Link first 5 students to parent
  for (let i = 0; i < 5; i++) {
    await prisma.student.update({
      where: { id: allCreatedStudents[i].id },
      data: { parentId: parent.id }
    });
  }

  // --- 9. SEED ACADEMIC MARKS / SCORES ---
  console.log('📝 Seeding mock score records for compiling...');
  // For JSS1A (first 5 students), seed scorecards for Maths, English, and Science
  const jss1aStudents = allCreatedStudents.slice(0, 5);
  const mathSub = subjects['MTH'];
  const engSub = subjects['ENG'];
  const sciSub = subjects['SCI'];

  const testTeacher = teachers['fidelis@greenwood.com'];

  for (const stud of jss1aStudents) {
    // Maths Scores
    await prisma.score.create({
      data: {
        schoolId,
        studentId: stud.id,
        subjectId: mathSub.id,
        termId: term.id,
        classId: stud.classId,
        armId: stud.armId,
        ca1: 12, // out of 15
        ca2: 13, // out of 15
        assignment: 8, // out of 10
        exam: 52, // out of 60
        total: 85,
        grade: 'A1',
        remarks: 'Excellent work',
        teacherId: testTeacher.id
      }
    });

    // English Scores
    await prisma.score.create({
      data: {
        schoolId,
        studentId: stud.id,
        subjectId: engSub.id,
        termId: term.id,
        classId: stud.classId,
        armId: stud.armId,
        ca1: 10,
        ca2: 11,
        assignment: 7,
        exam: 45,
        total: 73,
        grade: 'B2',
        remarks: 'Very Good',
        teacherId: teachers['cordelia@greenwood.com'].id
      }
    });

    // Science Scores
    await prisma.score.create({
      data: {
        schoolId,
        studentId: stud.id,
        subjectId: sciSub.id,
        termId: term.id,
        classId: stud.classId,
        armId: stud.armId,
        ca1: 8,
        ca2: 9,
        assignment: 6,
        exam: 32,
        total: 55,
        grade: 'C5',
        remarks: 'Credit',
        teacherId: teachers['ode@greenwood.com'].id
      }
    });
  }
  console.log('📝 Successfully pre-seeded scorecards for JSS 1A.');

  // --- 10. SEED DAILY & TERM ATTENDANCE ---
  console.log('📅 Seeding mock attendance summaries...');
  for (const stud of allCreatedStudents) {
    await prisma.attendance.create({
      data: {
        schoolId,
        studentId: stud.id,
        termId: term.id,
        classId: stud.classId,
        armId: stud.armId,
        daysPresent: 58,
        daysAbsent: 2
      }
    });
  }

  // --- 11. EVENTS AND ANNOUNCEMENTS ---
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  await prisma.event.create({
    data: {
      schoolId,
      title: 'Inter-House Sports Tournament',
      description: 'Annual inter-house athletic games and trophy contest.',
      date: `${year}-${month}-20`,
      time: '09:00 - 15:00'
    }
  });

  await prisma.announcement.create({
    data: {
      schoolId,
      title: 'First Term Exams Schedule',
      content: 'All terminal examinations will begin on the 10th of next month. Ensure all study materials are in order.',
      date: `${year}-${month}-05`
    }
  });

  console.log('🚀 Universal synthetic data seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
