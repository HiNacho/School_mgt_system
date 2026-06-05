const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database wipe & clean admin seed...');

  // 1. Delete all existing records from all tables
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

  console.log('✅ All existing records deleted.');

  // 2. Create tenant schools
  const greenwood = await prisma.school.create({
    data: {
      name: 'Greenwood Secondary Academy',
      slug: 'greenwood-secondary',
      logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop',
      address: 'Plot 12, Admiralty Way, Lekki Phase 1, Lagos, Nigeria',
      phone: '+234 803 111 2222',
      email: 'info@greenwood.edu.ng',
      gradingType: 'SECONDARY',
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
      gradingType: 'PRIMARY',
    },
  });

  console.log('🏫 Tenant schools created.');

  // 3. Create grading scales
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

  console.log('📈 Grading rules seeded.');

  // 4. Create sessions & terms
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
  for (let i = 0; i < termsList.length; i++) {
    await prisma.term.create({
      data: {
        schoolId: greenwood.id,
        sessionId: sessionGreenwood.id,
        name: termsList[i],
        isCurrent: i === 0,
      },
    });

    await prisma.term.create({
      data: {
        schoolId: lagosExcel.id,
        sessionId: sessionLagos.id,
        name: termsList[i],
        isCurrent: i === 0,
      },
    });
  }

  console.log('📅 Sessions and Terms initialized.');

  // 5. Seed only admin login credentials
  await prisma.user.create({
    data: {
      schoolId: greenwood.id,
      email: 'admin@greenwood.com',
      passwordHash: 'hashed_password_123',
      firstName: 'Kola',
      lastName: 'Adekunle',
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.user.create({
    data: {
      schoolId: lagosExcel.id,
      email: 'admin@lagosexcel.com',
      passwordHash: 'hashed_password_123',
      firstName: 'Amina',
      lastName: 'Usman',
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.user.create({
    data: {
      schoolId: greenwood.id,
      email: 'superadmin@system.com',
      passwordHash: 'hashed_password_123',
      firstName: 'Archibong',
      lastName: 'Bassey',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('👤 Admin & Superadmin user credentials seeded.');
  console.log('🎉 Database is now fully prepared for a clean start!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error clearing/seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
