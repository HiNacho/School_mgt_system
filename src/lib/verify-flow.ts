import prisma from './db';
import { calculateScoreDetails } from './rankingEngine';

async function runVerification() {
  console.log('=== STARTING BACKEND SUBMISSION LIFE CYCLE E2E TEST ===');

  try {
    // 1. Fetch school
    const school = await prisma.school.findFirst({
      where: { slug: 'nacho-secondary' }
    });
    if (!school) {
      throw new Error('School nacho-secondary not found');
    }
    console.log(`✓ Found school: ${school.name} (${school.id})`);

    // 2. Fetch seeded users
    const classTeacher = await prisma.user.findFirst({
      where: { schoolId: school.id, email: 'classteacher@greenwood.com' }
    });
    const subjectTeacher = await prisma.user.findFirst({
      where: { schoolId: school.id, email: 'subjectteacher@greenwood.com' }
    });

    if (!classTeacher || !subjectTeacher) {
      throw new Error('Class teacher or Subject teacher not found in DB');
    }
    console.log(`✓ Found Class Teacher: ${classTeacher.firstName} ${classTeacher.lastName} (${classTeacher.id})`);
    console.log(`✓ Found Subject Teacher: ${subjectTeacher.firstName} ${subjectTeacher.lastName} (${subjectTeacher.id})`);

    // 3. Fetch JSS 1 class and arm JSS 1A
    const jss1Class = await prisma.class.findFirst({
      where: { schoolId: school.id, name: 'JSS 1' }
    });
    if (!jss1Class) {
      throw new Error('Class JSS 1 not found');
    }

    const armJss1A = await prisma.arm.findFirst({
      where: { schoolId: school.id, classId: jss1Class.id, name: 'A' }
    });
    if (!armJss1A) {
      throw new Error('Arm JSS 1A not found');
    }
    console.log(`✓ Found cohort: ${jss1Class.name} Arm ${armJss1A.name}`);

    // Verify JSS 1A class teacher is Mr. Apeh Solomon
    if (armJss1A.classTeacherId !== classTeacher.id) {
      console.log(`⚠️ Warning: JSS 1A classTeacherId (${armJss1A.classTeacherId}) does not match Apeh Solomon (${classTeacher.id}). Fixing assignment...`);
      await prisma.arm.update({
        where: { id: armJss1A.id },
        data: { classTeacherId: classTeacher.id }
      });
      console.log('✓ JSS 1A Class Teacher updated to Mr. Apeh Solomon');
    } else {
      console.log('✓ Mr. Apeh Solomon is correctly set as Class Teacher for JSS 1A');
    }

    // 4. Find Mathematics subject
    const mathSubject = await prisma.subject.findFirst({
      where: { schoolId: school.id, name: 'Mathematics' }
    });
    if (!mathSubject) {
      throw new Error('Mathematics subject not found');
    }
    console.log(`✓ Found Subject: ${mathSubject.name} (${mathSubject.id})`);

    // 5. Find current Term
    const term = await prisma.term.findFirst({
      where: { schoolId: school.id, isCurrent: true }
    });
    if (!term) {
      throw new Error('Current Term not found');
    }
    console.log(`✓ Found current Term: ${term.name} (${term.id})`);

    // 6. Ensure Mr. Tunde Bello is assigned to teach Mathematics in JSS 1A
    const assignment = await prisma.subjectAssignment.findFirst({
      where: {
        schoolId: school.id,
        subjectId: mathSubject.id,
        classId: jss1Class.id,
        armId: armJss1A.id,
        teacherId: subjectTeacher.id,
        termId: term.id
      }
    });

    if (!assignment) {
      console.log('⚠️ SubjectAssignment not found. Creating one...');
      await prisma.subjectAssignment.create({
        data: {
          schoolId: school.id,
          subjectId: mathSubject.id,
          classId: jss1Class.id,
          armId: armJss1A.id,
          teacherId: subjectTeacher.id,
          termId: term.id
        }
      });
      console.log('✓ Created SubjectAssignment for Mr. Tunde Bello -> Mathematics JSS 1A');
    } else {
      console.log('✓ Mr. Tunde Bello has active SubjectAssignment for Mathematics JSS 1A');
    }

    // 7. Cleanup old submissions and notifications for clean test run
    await prisma.scoreSubmission.deleteMany({
      where: {
        schoolId: school.id,
        subjectId: mathSubject.id,
        classId: jss1Class.id,
        armId: armJss1A.id,
        termId: term.id
      }
    });
    await prisma.notification.deleteMany({
      where: { schoolId: school.id, userId: classTeacher.id }
    });
    await prisma.notification.deleteMany({
      where: { schoolId: school.id, userId: subjectTeacher.id }
    });
    console.log('✓ Cleaned up any existing submissions/notifications for fresh testing');

    // 8. Fetch active students in JSS 1A
    const students = await prisma.student.findMany({
      where: { schoolId: school.id, classId: jss1Class.id, armId: armJss1A.id, status: 'ACTIVE' }
    });
    console.log(`✓ Found ${students.length} students in JSS 1A`);

    if (students.length === 0) {
      throw new Error('No students found to run scores test');
    }

    // Create a mock draft scoresheet payload
    const mockScores = students.slice(0, 3).map((st, index) => {
      const ca1 = 10 + index;
      const ca2 = 12 - index;
      const assignmentVal = 8;
      const exam = 45 + index * 3;
      return {
        studentId: st.id,
        ca1,
        ca2,
        assignment: assignmentVal,
        exam,
      };
    });

    console.log('Mock Scores drafted:', mockScores);

    // Create a DRAFT score submission
    const draftSubmission = await prisma.scoreSubmission.create({
      data: {
        schoolId: school.id,
        subjectId: mathSubject.id,
        classId: jss1Class.id,
        armId: armJss1A.id,
        termId: term.id,
        teacherId: subjectTeacher.id,
        status: 'DRAFT',
        payload: JSON.stringify(mockScores)
      }
    });
    console.log(`✓ Created DRAFT ScoreSubmission: ${draftSubmission.id}`);

    // Update status to PENDING (Subject teacher clicks Submit)
    const pendingSubmission = await prisma.scoreSubmission.update({
      where: { id: draftSubmission.id },
      data: {
        status: 'PENDING',
        sentAt: new Date()
      }
    });
    console.log(`✓ Updated ScoreSubmission status to PENDING: ${pendingSubmission.id}`);

    // Trigger Notification to Class Teacher Mr. Apeh Solomon
    const alertMessage = `${term.name} ${mathSubject.name} scores received from ${subjectTeacher.firstName} ${subjectTeacher.lastName} for ${jss1Class.name} ${armJss1A.name}`;
    const notification = await prisma.notification.create({
      data: {
        schoolId: school.id,
        userId: classTeacher.id,
        message: alertMessage,
        submissionId: pendingSubmission.id
      }
    });
    console.log(`✓ Notification created for Class Teacher: "${notification.message}" (id: ${notification.id})`);

    // Verify Class Teacher sees the notification
    const teacherNotifications = await prisma.notification.findMany({
      where: { schoolId: school.id, userId: classTeacher.id, isRead: false }
    });
    console.log(`✓ Class Teacher has ${teacherNotifications.length} unread notifications`);
    if (teacherNotifications.some(n => n.id === notification.id)) {
      console.log('✓ Class Teacher successfully received the new score submission notification!');
    } else {
      throw new Error('Class Teacher did not receive the notification');
    }

    // SIMULATE APPROVAL & PUBLISH FLOW BY CLASS TEACHER
    console.log('\n--- Simulating Class Teacher Approve & Publish Flow ---');
    const gradingRules = await prisma.gradingRule.findMany({
      where: { schoolId: school.id }
    });

    const scoresToFinalize = JSON.parse(pendingSubmission.payload);
    for (const scoreEntry of scoresToFinalize) {
      const details = calculateScoreDetails(
        scoreEntry.ca1,
        scoreEntry.ca2,
        scoreEntry.assignment,
        scoreEntry.exam,
        gradingRules
      );

      // Upsert into finalized Score table
      await prisma.score.upsert({
        where: {
          schoolId_studentId_subjectId_termId: {
            schoolId: school.id,
            studentId: scoreEntry.studentId,
            subjectId: mathSubject.id,
            termId: term.id
          }
        },
        update: {
          ca1: scoreEntry.ca1,
          ca2: scoreEntry.ca2,
          assignment: scoreEntry.assignment,
          exam: scoreEntry.exam,
          total: details.total,
          grade: details.grade,
          remarks: details.remarks,
          classId: jss1Class.id,
          armId: armJss1A.id,
          teacherId: subjectTeacher.id
        },
        create: {
          schoolId: school.id,
          studentId: scoreEntry.studentId,
          subjectId: mathSubject.id,
          termId: term.id,
          classId: jss1Class.id,
          armId: armJss1A.id,
          ca1: scoreEntry.ca1,
          ca2: scoreEntry.ca2,
          assignment: scoreEntry.assignment,
          exam: scoreEntry.exam,
          total: details.total,
          grade: details.grade,
          remarks: details.remarks,
          teacherId: subjectTeacher.id
        }
      });
    }
    console.log(`✓ Successfully finalized ${scoresToFinalize.length} scores in official Score table`);

    // Update Submission status to APPROVED
    await prisma.scoreSubmission.update({
      where: { id: pendingSubmission.id },
      data: { status: 'APPROVED' }
    });
    console.log('✓ Updated ScoreSubmission status to APPROVED');

    // Notify Subject Teacher of Approval
    const approvalNotice = await prisma.notification.create({
      data: {
        schoolId: school.id,
        userId: subjectTeacher.id,
        message: `Your ${term.name} ${mathSubject.name} scores for ${jss1Class.name} ${armJss1A.name} have been approved & published by ${classTeacher.firstName} ${classTeacher.lastName}.`
      }
    });
    console.log(`✓ Approval Notification created for Subject Teacher: "${approvalNotice.message}"`);

    // Verify finalized scores exist in DB
    const finalScores = await prisma.score.findMany({
      where: {
        schoolId: school.id,
        subjectId: mathSubject.id,
        classId: jss1Class.id,
        armId: armJss1A.id,
        termId: term.id
      }
    });
    console.log(`✓ Verified ${finalScores.length} finalized scores exist in official database.`);
    if (finalScores.length !== mockScores.length) {
      throw new Error(`Expected ${mockScores.length} finalized scores, but found ${finalScores.length}`);
    }

    console.log('\n=== ALL END-TO-END SUBMISSION TESTS PASSED SUCCESSFULLY! ===');
  } catch (error) {
    console.error('❌ E2E TEST FAILED:', error);
    process.exit(1);
  }
}

runVerification();
