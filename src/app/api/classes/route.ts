// Classes & Arms API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch all classes and arms with their student enrollment and teacher assignments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // Fetch classes for this school
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    // Fetch arms for this school
    const arms = await prisma.arm.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: {
        class: true,
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        _count: {
          select: { students: true }
        }
      }
    });

    // Fetch active staff in school who can be assigned as class teachers
    const staff = await prisma.user.findMany({
      where: { 
        schoolId, 
        role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER', 'SCHOOL_ADMIN'] },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        classes,
        arms,
        staff
      }
    });
  } catch (error: any) {
    console.error('Classes GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch academic classes registry' }, { status: 500 });
  }
}

// 2. POST: Create a new Class or a new Arm
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, schoolId, name, classId, classTeacherId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (type === 'CLASS') {
      // Check if class with identical name already exists for this school
      const existing = await prisma.class.findFirst({
        where: { 
          schoolId,
          name: name.trim()
        }
      });

      if (existing) {
        return NextResponse.json({ error: `Class level "${name}" already exists.` }, { status: 400 });
      }

      // Create new Class
      const newClass = await prisma.class.create({
        data: {
          schoolId,
          name: name.trim()
        }
      });

      return NextResponse.json({ success: true, data: newClass });
    } 
    
    else if (type === 'ARM') {
      if (!classId) {
        return NextResponse.json({ error: 'Associated Class Level is required' }, { status: 400 });
      }

      // Check if arm with identical name already exists within this specific class level
      const existing = await prisma.arm.findFirst({
        where: { 
          schoolId,
          classId,
          name: name.trim()
        }
      });

      if (existing) {
        return NextResponse.json({ error: `Arm subdivision "${name}" already exists under this class.` }, { status: 400 });
      }

      // Create new Arm
      const newArm = await prisma.arm.create({
        data: {
          schoolId,
          classId,
          name: name.trim(),
          classTeacherId: classTeacherId || null
        },
        include: {
          class: true,
          classTeacher: true
        }
      });

      return NextResponse.json({ success: true, data: newArm });
    } 
    
    else {
      return NextResponse.json({ error: 'Invalid operation type specified. Use CLASS or ARM.' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Classes POST Error:', error);
    return NextResponse.json({ error: 'Failed to initialize academic division' }, { status: 500 });
  }
}

// 3. PUT: Assign or update a Class Teacher to an Arm
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { armId, classTeacherId, schoolId } = body;

    if (!armId || !schoolId) {
      return NextResponse.json({ error: 'Arm ID and School ID are required' }, { status: 400 });
    }

    // Verify arm belongs to school tenant boundary
    const arm = await prisma.arm.findFirst({
      where: { id: armId, schoolId }
    });

    if (!arm) {
      return NextResponse.json({ error: 'Arm not found within active school context' }, { status: 404 });
    }

    // Update class teacher assignment
    const updatedArm = await prisma.arm.update({
      where: { id: armId },
      data: {
        classTeacherId: classTeacherId || null
      },
      include: {
        class: true,
        classTeacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: updatedArm });
  } catch (error: any) {
    console.error('Classes PUT Error:', error);
    return NextResponse.json({ error: 'Failed to assign class teacher' }, { status: 500 });
  }
}

// 4. DELETE: Delete a Class or an Arm subdivision
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const armId = searchParams.get('armId');
    const classId = searchParams.get('classId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    if (armId) {
      // 1. Verify arm exists in this school
      const arm = await prisma.arm.findFirst({
        where: { id: armId, schoolId },
        include: { class: true }
      });

      if (!arm) {
        return NextResponse.json({ error: 'Class division (Arm) not found within active school context' }, { status: 404 });
      }

      // 2. Check if students are registered in this arm
      const studentCount = await prisma.student.count({
        where: { schoolId, armId }
      });

      if (studentCount > 0) {
        return NextResponse.json({ 
          error: `Cannot delete class division "${arm.class.name} Arm ${arm.name}": there are ${studentCount} student(s) currently registered in this division. Please transfer or delete the students first.` 
        }, { status: 400 });
      }

      // 3. Delete the arm (cascading deletes for assignments, scores, comments, attendance, submissions will happen automatically in Prisma)
      await prisma.arm.delete({
        where: { id: armId }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Class division "${arm.class.name} Arm ${arm.name}" successfully deleted.` 
      });
    } 
    
    else if (classId) {
      // 1. Verify class exists in this school
      const cls = await prisma.class.findFirst({
        where: { id: classId, schoolId }
      });

      if (!cls) {
        return NextResponse.json({ error: 'Class cohort level not found within active school context' }, { status: 404 });
      }

      // 2. Check if arms are registered under this class level
      const armCount = await prisma.arm.count({
        where: { schoolId, classId }
      });

      if (armCount > 0) {
        return NextResponse.json({ 
          error: `Cannot delete class level "${cls.name}": it contains active subdivision streams (Arms). Please delete all arms first.` 
        }, { status: 400 });
      }

      // 3. Check if students are registered directly under this class
      const studentCount = await prisma.student.count({
        where: { schoolId, classId }
      });

      if (studentCount > 0) {
        return NextResponse.json({ 
          error: `Cannot delete class level "${cls.name}": there are ${studentCount} student(s) registered under this level. Please transfer or delete the students first.` 
        }, { status: 400 });
      }

      // 4. Delete the class
      await prisma.class.delete({
        where: { id: classId }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Class cohort level "${cls.name}" successfully deleted.` 
      });
    } 
    
    else {
      return NextResponse.json({ error: 'Missing required delete parameters (armId or classId)' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Classes DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to complete delete operation' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
