const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schoolId = '892ebef3-22a9-4efa-a5ed-47c919aa676c'; // King's College
  console.log("Starting DB query audit for King's College...");

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  console.log("School found:", school?.name);

  // 1. Setup/Terms
  const terms = await prisma.term.findMany({ where: { schoolId } });
  const activeTerm = terms.find(t => t.isCurrent);
  console.log("Terms count:", terms.length, "Active Term:", activeTerm?.name);

  // 2. Students
  const students = await prisma.student.findMany({ where: { schoolId } });
  console.log("Students count:", students.length);

  // 3. Parents
  const parents = await prisma.parent.findMany({ where: { schoolId } });
  console.log("Parents count:", parents.length);

  // 4. Staff
  const staff = await prisma.user.findMany({
    where: { schoolId, role: { in: ['SCHOOL_ADMIN', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] } }
  });
  console.log("Staff count:", staff.length);

  // 5. Events
  const events = await prisma.event.findMany({ where: { schoolId } });
  console.log("Events count:", events.length);

  // 6. Announcements
  const announcements = await prisma.announcement.findMany({ where: { schoolId } });
  console.log("Announcements count:", announcements.length);

  // 7. Subjects
  const subjects = await prisma.subject.findMany({ where: { schoolId } });
  console.log("Subjects count:", subjects.length);

  // 8. Attendance
  const attendance = await prisma.attendance.findMany({ where: { schoolId } });
  console.log("Attendance records count:", attendance.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
