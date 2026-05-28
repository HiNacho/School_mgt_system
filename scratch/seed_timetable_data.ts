import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const schoolId = 'c47f0190-50e4-4a14-9668-a393fbf6473e'; // Greenwood Secondary Academy

async function main() {
  console.log('🌱 Starting optimized database seeding for Greenwood Secondary Academy...');

  // 1. Verify Greenwood and Active Term
  const school = await prisma.school.findUnique({
    where: { id: schoolId }
  });
  if (!school) {
    throw new Error(`School with ID ${schoolId} not found.`);
  }
  console.log(`🏫 Found school: ${school.name}`);

  const activeTerm = await prisma.term.findFirst({
    where: { schoolId, isCurrent: true }
  });
  if (!activeTerm) {
    throw new Error('No active current term found for the school.');
  }
  console.log(`📅 Found current term: ${activeTerm.name} (ID: ${activeTerm.id})`);

  // 2. Clear Old Timetable Requirements, Slots, Assignments, and Scores
  console.log('🧹 Clearing old timetable-related data...');
  await prisma.timetableSlot.deleteMany({ where: { schoolId } });
  await prisma.timetableRequirement.deleteMany({ where: { schoolId } });
  await prisma.subjectAssignment.deleteMany({ where: { schoolId } });
  await prisma.score.deleteMany({ where: { schoolId } });
  await prisma.scoreSubmission.deleteMany({ where: { schoolId } });
  await prisma.attendance.deleteMany({ where: { schoolId } });
  await prisma.reportCardComment.deleteMany({ where: { schoolId } });

  // Update arms to unlink any old class teachers
  await prisma.arm.updateMany({
    where: { schoolId },
    data: { classTeacherId: null }
  });

  // Delete old teacher profiles
  await prisma.teacherProfile.deleteMany({ where: { schoolId } });

  // Delete old subject teachers and class teachers
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      schoolId,
      role: { in: ['SUBJECT_TEACHER', 'CLASS_TEACHER'] }
    }
  });
  console.log(`👤 Deleted ${deletedUsers.count} old teacher accounts.`);

  // Delete old subjects
  const deletedSubjects = await prisma.subject.deleteMany({ where: { schoolId } });
  console.log(`📚 Deleted ${deletedSubjects.count} old subjects.`);

  // 3. Define the 10 subjects and their codes
  const subjectsData = [
    { name: 'Mathematics', code: 'MTH', category: 'COMPULSORY' },
    { name: 'English Language', code: 'ENG', category: 'COMPULSORY' },
    { name: 'Computer Studies', code: 'CMP', category: 'COMPULSORY' },
    { name: 'Basic Science', code: 'SCI', category: 'COMPULSORY' },
    { name: 'Introductory Technology', code: 'INT', category: 'COMPULSORY' },
    { name: 'Home Economics', code: 'HEC', category: 'COMPULSORY' },
    { name: 'Christian Religious Knowledge', code: 'CRK', category: 'COMPULSORY' },
    { name: 'Literature-in-English', code: 'LIT', category: 'COMPULSORY' },
    { name: 'Social Studies', code: 'SOS', category: 'COMPULSORY' },
    { name: 'Agricultural Science', code: 'AGR', category: 'COMPULSORY' },
  ];

  console.log('📚 Registering the 10 new subjects...');
  const subjects: Record<string, any> = {};
  for (const s of subjectsData) {
    const sub = await prisma.subject.create({
      data: {
        schoolId,
        name: s.name,
        code: s.code,
        category: s.category
      }
    });
    subjects[s.code] = sub;
  }
  console.log('📚 Successfully registered subjects.');

  // 4. Create the new 10 primary teachers and level helpers
  console.log('👤 Creating teacher accounts...');
  const teachersList = [
    // Main Teachers (used as class teachers too)
    { email: 'fidelis@greenwood.com', firstName: 'Mr.', lastName: 'Fidelis', role: 'CLASS_TEACHER' },
    { email: 'cordelia@greenwood.com', firstName: 'Mrs.', lastName: 'Cordelia', role: 'CLASS_TEACHER' },
    { email: 'apeh@greenwood.com', firstName: 'Mr.', lastName: 'Apeh', role: 'CLASS_TEACHER' },
    { email: 'ode@greenwood.com', firstName: 'Mr.', lastName: 'Ode', role: 'CLASS_TEACHER' },
    { email: 'gynag@greenwood.com', firstName: 'Mr.', lastName: 'Gynag', role: 'CLASS_TEACHER' },
    { email: 'rita@greenwood.com', firstName: 'Mrs.', lastName: 'Rita', role: 'CLASS_TEACHER' },
    { email: 'vera@greenwood.com', firstName: 'Mrs.', lastName: 'Vera', role: 'CLASS_TEACHER' },
    { email: 'cynthia@greenwood.com', firstName: 'Mrs.', lastName: 'Cynthia', role: 'CLASS_TEACHER' },
    { email: 'suwa@greenwood.com', firstName: 'Mr.', lastName: 'Suwa', role: 'CLASS_TEACHER' },
    { email: 'mohammed@greenwood.com', firstName: 'Mrs.', lastName: 'Mohammed', role: 'CLASS_TEACHER' },

    // level helpers for heavy subjects
    { email: 'fidelis2@greenwood.com', firstName: 'Mr. Fidelis', lastName: '(JSS2)', role: 'SUBJECT_TEACHER' },
    { email: 'fidelis3@greenwood.com', firstName: 'Mr. Fidelis', lastName: '(JSS3)', role: 'SUBJECT_TEACHER' },
    
    { email: 'cordelia2@greenwood.com', firstName: 'Mrs. Cordelia', lastName: '(JSS2)', role: 'SUBJECT_TEACHER' },
    { email: 'cordelia3@greenwood.com', firstName: 'Mrs. Cordelia', lastName: '(JSS3)', role: 'SUBJECT_TEACHER' },
    
    { email: 'ode2@greenwood.com', firstName: 'Mr. Ode', lastName: '(JSS2)', role: 'SUBJECT_TEACHER' },
    { email: 'ode3@greenwood.com', firstName: 'Mr. Ode', lastName: '(JSS3)', role: 'SUBJECT_TEACHER' }
  ];

  const teachers: Record<string, any> = {};
  for (const t of teachersList) {
    const user = await prisma.user.create({
      data: {
        schoolId,
        email: t.email,
        passwordHash: 'password', // Demo bypass password
        firstName: t.firstName,
        lastName: t.lastName,
        role: t.role,
        status: 'ACTIVE'
      }
    });

    // To allow perfect scheduling in a 6-period day, we set:
    // consecutiveLimit: 6 (can teach back-to-back classes)
    // maxPeriodsPerDay: 6 (can teach up to 6 classes in a day)
    // maxPeriodsPerWeek: 30 (can teach up to 30 periods in a week)
    await prisma.teacherProfile.create({
      data: {
        schoolId,
        userId: user.id,
        maxPeriodsPerWeek: 30,
        maxPeriodsPerDay: 6,
        consecutiveLimit: 6,
        unavailableDays: ''
      }
    });

    teachers[t.email] = user;
  }
  console.log(`👤 Created ${teachersList.length} teacher accounts with highly solvable TeacherProfiles.`);

  // 5. Fetch all class arms
  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { arms: true }
  });

  // Assign class teachers to arms
  const primaryTeacherEmails = [
    'fidelis@greenwood.com',
    'cordelia@greenwood.com',
    'apeh@greenwood.com',
    'ode@greenwood.com',
    'gynag@greenwood.com',
    'suwa@greenwood.com',
    'rita@greenwood.com',
    'vera@greenwood.com',
    'mohammed@greenwood.com'
  ];

  let armIndex = 0;
  for (const c of classes) {
    for (const arm of c.arms) {
      if (armIndex < primaryTeacherEmails.length) {
        const teacherEmail = primaryTeacherEmails[armIndex];
        const teacher = teachers[teacherEmail];
        await prisma.arm.update({
          where: { id: arm.id },
          data: { classTeacherId: teacher.id }
        });
        console.log(`🏫 Linked Class Teacher ${teacher.firstName} ${teacher.lastName} to ${c.name} ${arm.name}`);
        armIndex++;
      }
    }
  }

  // 6. Build the Allocations/Requirements and registry assignments for all 9 class arms
  console.log('📌 Configuring SubjectAssignments and TimetableRequirements across all 9 arms...');

  for (const c of classes) {
    let mathsTeacher = teachers['fidelis@greenwood.com'];
    let englishTeacher = teachers['cordelia@greenwood.com'];
    let scienceTeacher = teachers['ode@greenwood.com'];

    if (c.name === 'JSS 2') {
      mathsTeacher = teachers['fidelis2@greenwood.com'];
      englishTeacher = teachers['cordelia2@greenwood.com'];
      scienceTeacher = teachers['ode2@greenwood.com'];
    } else if (c.name === 'JSS 3') {
      mathsTeacher = teachers['fidelis3@greenwood.com'];
      englishTeacher = teachers['cordelia3@greenwood.com'];
      scienceTeacher = teachers['ode3@greenwood.com'];
    }

    // subjects configuration with exact periods summing to 30
    const allocations = [
      { code: 'MTH', teacher: mathsTeacher, periods: 5 },
      { code: 'ENG', teacher: englishTeacher, periods: 5 },
      { code: 'SCI', teacher: scienceTeacher, periods: 4 },
      { code: 'CMP', teacher: teachers['apeh@greenwood.com'], periods: 3 },
      { code: 'INT', teacher: teachers['gynag@greenwood.com'], periods: 3 },
      { code: 'SOS', teacher: teachers['suwa@greenwood.com'], periods: 3 },
      { code: 'AGR', teacher: teachers['mohammed@greenwood.com'], periods: 2 },
      { code: 'HEC', teacher: teachers['rita@greenwood.com'], periods: 2 },
      { code: 'CRK', teacher: teachers['vera@greenwood.com'], periods: 2 },
      { code: 'LIT', teacher: teachers['cynthia@greenwood.com'], periods: 1 }
    ];

    for (const arm of c.arms) {
      console.log(`👉 Setting up allocations for ${c.name} Arm ${arm.name}...`);
      for (const alloc of allocations) {
        const subject = subjects[alloc.code];
        
        // A. SubjectAssignment (Registry)
        await prisma.subjectAssignment.create({
          data: {
            schoolId,
            subjectId: subject.id,
            classId: c.id,
            armId: arm.id,
            teacherId: alloc.teacher.id,
            termId: activeTerm.id
          }
        });

        // B. TimetableRequirement (Scheduling limit)
        await prisma.timetableRequirement.create({
          data: {
            schoolId,
            classId: c.id,
            armId: arm.id,
            subjectId: subject.id,
            teacherId: alloc.teacher.id,
            periodsPerWeek: alloc.periods
          }
        });
      }
    }
  }

  console.log('✅ Database update successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
