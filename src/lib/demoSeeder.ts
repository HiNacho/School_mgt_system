import prisma from './db';
import bcrypt from 'bcryptjs';

interface SeedResult {
  schoolId: string;
  slug: string;
  adminEmail: string;
  adminUsername: string;
  studentCount: number;
}

export async function seedDemoSchool(schoolName: string, leadEmail: string, schoolTypeInput?: string): Promise<SeedResult> {
  console.log(`[DemoSeeder] Starting demo seed for: "${schoolName}"`);
  
  // 1. Generate unique slug
  const cleanSlug = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const slug = `${cleanSlug}-${randomSuffix}`;

  // 2. Hash standard password 'password'
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password', salt);

  // Determine grading type based on school type
  const isPrimary = schoolTypeInput === 'PRIMARY';
  const gradingType = isPrimary ? 'PRIMARY' : 'SECONDARY';

  // 3. Create School record
  const school = await prisma.school.create({
    data: {
      name: schoolName,
      slug: slug,
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop',
      address: 'Generated Demo Campus, Educational District',
      phone: '+1234567890',
      email: leadEmail,
      gradingType: gradingType,
      subscriptionPlan: 'Standard',
      subscriptionStatus: 'trial',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
    },
  });

  const schoolId = school.id;

  // 4. Create Grading Scale Rules
  if (isPrimary) {
    const primaryRules = [
      { minScore: 80, maxScore: 100, grade: 'A', interpretation: 'Excellent' },
      { minScore: 60, maxScore: 79.9, grade: 'B', interpretation: 'Good' },
      { minScore: 40, maxScore: 59.9, grade: 'C', interpretation: 'Pass' },
      { minScore: 0, maxScore: 39.9, grade: 'D', interpretation: 'Needs Improvement' },
    ];
    await prisma.gradingRule.createMany({
      data: primaryRules.map(r => ({ schoolId, ...r })),
    });
  } else {
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
    await prisma.gradingRule.createMany({
      data: secondaryRules.map(r => ({ schoolId, ...r })),
    });
  }

  // 5. Create Sessions & Terms
  const session = await prisma.academicSession.create({
    data: {
      schoolId,
      name: '2025/2026',
      isCurrent: true,
    },
  });

  const termNames = ['First Term', 'Second Term', 'Third Term'];
  const terms = await Promise.all(
    termNames.map((name, idx) =>
      prisma.term.create({
        data: {
          schoolId,
          sessionId: session.id,
          name,
          isCurrent: idx === 0, // First Term is active
        },
      })
    )
  );
  const currentTermId = terms[0].id;

  // 6. Create Subjects
  const subjectsData = [
    { name: 'Mathematics', code: 'MTH', category: 'COMPULSORY', color: 'blue' },
    { name: 'English Language', code: 'ENG', category: 'COMPULSORY', color: 'purple' },
    { name: 'Basic Science', code: 'BSC', category: 'COMPULSORY', color: 'emerald' },
    { name: 'Civic Education', code: 'CVE', category: 'COMPULSORY', color: 'amber' },
    { name: 'Agricultural Science', code: 'AGR', category: 'ELECTIVE', color: 'orange' },
  ];
  
  const subjects = await Promise.all(
    subjectsData.map(s => 
      prisma.subject.create({
        data: { schoolId, ...s }
      })
    )
  );

  // 7. Create Staff Users
  const adminUsername = `admin_${randomSuffix}`;
  const admin = await prisma.user.create({
    data: {
      schoolId,
      username: adminUsername,
      email: leadEmail,
      passwordHash,
      firstName: 'Lead',
      lastName: 'Administrator',
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  const classTeacher = await prisma.user.create({
    data: {
      schoolId,
      username: `classteacher_${randomSuffix}`,
      email: `classteacher@${slug}.com`,
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Okonkwo',
      title: 'Mrs.',
      role: 'CLASS_TEACHER',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  const subjectTeacher = await prisma.user.create({
    data: {
      schoolId,
      username: `subjectteacher_${randomSuffix}`,
      email: `subjectteacher@${slug}.com`,
      passwordHash,
      firstName: 'Tunde',
      lastName: 'Balogun',
      title: 'Mr.',
      role: 'SUBJECT_TEACHER',
      status: 'ACTIVE',
      isActive: true,
      isFirstLogin: false,
    },
  });

  // 8. Create Classes & Arms
  // Create 3 classes
  const classNames = isPrimary 
    ? ['Primary 1', 'Primary 2', 'Primary 3']
    : ['JSS 1', 'JSS 2', 'SSS 1'];

  const classes = await Promise.all(
    classNames.map(name => prisma.class.create({ data: { schoolId, name } }))
  );

  // Create arms
  // Class 1 gets Arm A (Class Teacher assigned) and Arm B
  const arm1A = await prisma.arm.create({
    data: {
      schoolId,
      classId: classes[0].id,
      name: 'A',
      classTeacherId: classTeacher.id,
    },
  });

  const arm1B = await prisma.arm.create({
    data: {
      schoolId,
      classId: classes[0].id,
      name: 'B',
      classTeacherId: null,
    },
  });

  // Class 2 and Class 3 get Arm A only
  const arm2A = await prisma.arm.create({
    data: {
      schoolId,
      classId: classes[1].id,
      name: 'A',
      classTeacherId: null,
    },
  });

  const arm3A = await prisma.arm.create({
    data: {
      schoolId,
      classId: classes[2].id,
      name: 'A',
      classTeacherId: null,
    },
  });

  const arms = [arm1A, arm1B, arm2A, arm3A];

  // 9. Assign Subject Teachers
  // Tunde (subjectTeacher) teaches all subjects in Class 1 Arm A
  await Promise.all(
    subjects.map(sub => 
      prisma.subjectAssignment.create({
        data: {
          schoolId,
          subjectId: sub.id,
          classId: classes[0].id,
          armId: arm1A.id,
          teacherId: subjectTeacher.id,
          termId: currentTermId,
        }
      })
    )
  );

  // 10. Generate 100 Students dynamically
  const firstNames = [
    'Zainab', 'Emeka', 'Fatima', 'Yetunde', 'Timi', 'David', 'Blessing', 'Amina', 'Tunde', 'Kola',
    'Chidinma', 'Ngozi', 'Abubakar', 'Ibrahim', 'Obi', 'Musa', 'Babajide', 'Aisha', 'Chioma', 'Uche',
    'Joy', 'Grace', 'Samuel', 'Daniel', 'Sarah', 'Esther', 'Victor', 'Emmanuel', 'Joseph', 'Kelechi'
  ];
  const lastNames = [
    'Alabi', 'Bello', 'Nwachukwu', 'George', 'Aliyu', 'Okeke', 'Effiong', 'Adekunle', 'Solomon', 'Usman',
    'Bassey', 'Brooks', 'Bennett', 'Okafor', 'Balogun', 'Diallo', 'Mensah', 'Kamara', 'Sow', 'Traore',
    'Keita', 'Kone', 'Bah', 'Cisse', 'Toure', 'Barry', 'Oumarou', 'Ndiaye', 'Adebayo', 'Eze'
  ];

  const studentsToInsert = [];
  for (let i = 1; i <= 100; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE';
    
    // Distribute evenly across the 4 arm options
    const armIdx = i % arms.length;
    const selectedArm = arms[armIdx];
    const selectedClassId = selectedArm.classId;

    studentsToInsert.push({
      schoolId,
      firstName: fName,
      lastName: lName,
      admissionNumber: `${slug.toUpperCase()}-2025-${String(i).padStart(3, '0')}`,
      gender,
      classId: selectedClassId,
      armId: selectedArm.id,
      status: 'ACTIVE',
      feesPaid: Math.random() > 0.3,
    });
  }

  // Insert students
  await prisma.student.createMany({
    data: studentsToInsert,
  });

  // Fetch inserted students to link with parents and seed scores
  const students = await prisma.student.findMany({
    where: { schoolId },
  });

  // 11. Create Parents & Link to Students
  // Create 10 parent accounts
  const parents = [];
  for (let i = 1; i <= 10; i++) {
    const parentEmail = `parent${i}@${slug}.com`;
    const pLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const parent = await prisma.parent.create({
      data: {
        schoolId,
        email: parentEmail,
        passwordHash,
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: pLastName,
        phone: `+123-parent-${i}`,
        address: `${i * 12} generated avenue, demo neighborhood`,
        status: 'ACTIVE',
      },
    });

    // Create corresponding user account
    await prisma.user.create({
      data: {
        schoolId,
        username: `parent_${i}_${randomSuffix}`,
        email: parentEmail,
        passwordHash,
        firstName: parent.firstName,
        lastName: parent.lastName,
        role: 'PARENT',
        parentId: parent.id,
        isFirstLogin: false,
        isActive: true,
        status: 'ACTIVE',
      },
    });

    parents.push(parent);
  }

  // Link students to parents (assign 10 students per parent)
  for (let idx = 0; idx < students.length; idx++) {
    const student = students[idx];
    const parentIdx = idx % parents.length;
    const parent = parents[parentIdx];
    
    await prisma.student.update({
      where: { id: student.id },
      data: {
        parentId: parent.id,
        passportPhoto: student.gender === 'FEMALE'
          ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop'
          : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop',
      },
    });
  }

  // 12. Pre-populate Scores for Class 1 Arm A (arm1A)
  // Let's seed scores for all students in Class 1 Arm A across all 5 subjects
  const arm1AStudents = students.filter(s => s.armId === arm1A.id);
  const rules = await prisma.gradingRule.findMany({ where: { schoolId } });

  const helperGetGrade = (score: number) => {
    const matched = rules.find(r => score >= r.minScore && score <= r.maxScore);
    return {
      grade: matched?.grade || 'F9',
      interpretation: matched?.interpretation || 'Fail'
    };
  };

  const scoresToInsert = [];
  for (const stud of arm1AStudents) {
    for (const sub of subjects) {
      // Generate realistic scores
      const ca1 = Math.round(10 + Math.random() * 5); // 10 - 15
      const ca2 = Math.round(8 + Math.random() * 7);  // 8 - 15
      const assignment = Math.round(5 + Math.random() * 5); // 5 - 10
      const exam = Math.round(30 + Math.random() * 30); // 30 - 60
      const total = ca1 + ca2 + assignment + exam;
      
      const { grade, interpretation } = helperGetGrade(total);

      scoresToInsert.push({
        schoolId,
        studentId: stud.id,
        subjectId: sub.id,
        termId: currentTermId,
        classId: classes[0].id,
        armId: arm1A.id,
        ca1,
        ca2,
        assignment,
        exam,
        total,
        grade,
        remarks: interpretation,
        teacherId: subjectTeacher.id,
      });
    }
  }

  if (scoresToInsert.length > 0) {
    await prisma.score.createMany({
      data: scoresToInsert,
    });
  }

  // 13. Create Events and Announcements
  const today = new Date();
  const yearStr = today.getFullYear();
  const monthStr = String(today.getMonth() + 1).padStart(2, '0');

  const events = [
    { title: 'Welcome Assembly', description: 'Orientation assembly for all new demo school staff and students.', date: `${yearStr}-${monthStr}-18`, time: '08:00 - 09:30' },
    { title: 'Inter-House Sports', description: 'Annual athletic events and field competitions.', date: `${yearStr}-${monthStr}-25`, time: '09:00 - 15:00' },
  ];

  await prisma.event.createMany({
    data: events.map(ev => ({ schoolId, ...ev })),
  });

  const announcements = [
    { title: 'Demo Sandbox Initialized', content: 'Welcome to your private NachoEd Sandbox environment! This environment is seeded with 100 students, teacher accounts, parent logins, and result metrics.', date: `${yearStr}-${monthStr}-16` },
    { title: 'Mid-Term Exam Schedule', content: 'Mid-term evaluation scores have been updated and locked for compilation. View results sheets under admin settings.', date: `${yearStr}-${monthStr}-16` },
  ];

  await prisma.announcement.createMany({
    data: announcements.map(ann => ({ schoolId, ...ann })),
  });

  console.log(`[DemoSeeder] Seeding completed successfully for school "${schoolName}" (ID: ${schoolId}). Seeded 100 students.`);

  return {
    schoolId,
    slug,
    adminEmail: leadEmail,
    adminUsername,
    studentCount: 100,
  };
}
