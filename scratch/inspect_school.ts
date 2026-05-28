import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const schoolId = 'c47f0190-50e4-4a14-9668-a393fbf6473e';

async function main() {
  const school = await prisma.school.findUnique({
    where: { id: schoolId }
  });

  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { arms: true }
  });

  const subjects = await prisma.subject.findMany({
    where: { schoolId }
  });

  const users = await prisma.user.findMany({
    where: { schoolId }
  });

  const info = {
    schoolName: school?.name,
    classes: classes.map(c => ({
      id: c.id,
      name: c.name,
      arms: c.arms.map(a => ({ id: a.id, name: a.name }))
    })),
    subjects: subjects.map(s => ({
      id: s.id,
      name: s.name,
      code: s.code,
      category: s.category
    })),
    teachers: users
      .filter(u => u.role === 'SUBJECT_TEACHER' || u.role === 'CLASS_TEACHER')
      .map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName
      }))
  };

  fs.writeFileSync(
    path.join('/Users/mac/Documents/Tech_projects/report_automation/scratch', 'school_info.json'),
    JSON.stringify(info, null, 2),
    'utf-8'
  );
  console.log("Successfully wrote school info to scratch/school_info.json");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
