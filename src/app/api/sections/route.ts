// Sections API — CRUD for SchoolSection management
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  NURSERY: 'Nursery / Pre-school',
  PRIMARY: 'Primary School',
  JUNIOR_SECONDARY: 'Junior Secondary School',
  SENIOR_SECONDARY: 'Senior Secondary School',
  CUSTOM: 'Other / Custom',
};

const DEFAULT_LEVELS: Record<string, string[]> = {
  NURSERY: ['Creche', 'Playgroup', 'Nursery 1', 'Nursery 2', 'Kindergarten'],
  PRIMARY: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
  JUNIOR_SECONDARY: ['JSS 1', 'JSS 2', 'JSS 3'],
  SENIOR_SECONDARY: ['SS 1', 'SS 2', 'SS 3'],
  CUSTOM: [],
};

// GET — list all sections for a school (with class counts and classes)
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'BURSAR']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const includeClasses = searchParams.get('includeClasses') === 'true';

    if (!schoolId) return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    requireSchoolScope(session, schoolId);

    const sectionsWhere: any = { schoolId };

    // Section-scoped admin: only show sections they manage
    const scope = session.managedSectionIds;
    if (scope && scope.length > 0) sectionsWhere.id = { in: scope };

    const sections = await prisma.schoolSection.findMany({
      where: sectionsWhere,
      orderBy: { displayOrder: 'asc' },
      include: {
        classes: includeClasses
          ? {
              orderBy: { levelOrder: 'asc' },
              include: {
                arms: {
                  orderBy: { name: 'asc' },
                  include: {
                    classTeacher: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { students: true } },
                  },
                },
                _count: { select: { students: true } },
              },
            }
          : { select: { id: true }, orderBy: { levelOrder: 'asc' } },
        _count: { select: { classes: true } },
      },
    });

    return NextResponse.json({ success: true, data: sections });
  } catch (error: any) {
    console.error('Sections GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch sections' }, { status: error.status || 500 });
  }
}

// POST — create a new section (optionally auto-create default class levels)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { schoolId, type, name, description, displayOrder, autoCreateLevels = true } = body;

    if (!schoolId || !type) return NextResponse.json({ error: 'schoolId and type are required' }, { status: 400 });
    requireSchoolScope(session, schoolId);

    // Check for duplicate
    const existing = await prisma.schoolSection.findUnique({
      where: { schoolId_type: { schoolId, type } },
    });
    if (existing) {
      return NextResponse.json({ error: `A ${type} section already exists for this school` }, { status: 409 });
    }

    const displayName = name || SECTION_DISPLAY_NAMES[type] || type;
    const order = displayOrder ?? ((['NURSERY', 'PRIMARY', 'JUNIOR_SECONDARY', 'SENIOR_SECONDARY'].indexOf(type) + 1) || 99);

    const section = await prisma.schoolSection.create({
      data: { schoolId, type, name: displayName, description, displayOrder: order, isActive: true },
    });

    // Auto-create default class levels if requested
    if (autoCreateLevels && DEFAULT_LEVELS[type]?.length > 0) {
      const classNames = DEFAULT_LEVELS[type];
      await prisma.class.createMany({
        data: classNames.map((className, idx) => ({
          schoolId,
          sectionId: section.id,
          name: className,
          levelOrder: idx + 1,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    // Update school's sectionTypes JSON
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { sectionTypes: true } });
    const currentTypes: string[] = school?.sectionTypes ? JSON.parse(school.sectionTypes) : [];
    if (!currentTypes.includes(type)) {
      await prisma.school.update({
        where: { id: schoolId },
        data: { sectionTypes: JSON.stringify([...currentTypes, type]) },
      });
    }

    const result = await prisma.schoolSection.findUnique({
      where: { id: section.id },
      include: { classes: { include: { arms: true }, orderBy: { levelOrder: 'asc' } }, _count: { select: { classes: true } } },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Sections POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create section' }, { status: error.status || 500 });
  }
}

// PUT — update section name, displayOrder, isActive
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { id, name, description, displayOrder, isActive } = body;

    if (!id) return NextResponse.json({ error: 'Section id is required' }, { status: 400 });

    const existing = await prisma.schoolSection.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    requireSchoolScope(session, existing.schoolId);

    const section = await prisma.schoolSection.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        displayOrder: displayOrder !== undefined ? displayOrder : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ success: true, data: section });
  } catch (error: any) {
    console.error('Sections PUT Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update section' }, { status: error.status || 500 });
  }
}

// DELETE — archive section (soft-delete) only if no active students
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Section id is required' }, { status: 400 });

    const section = await prisma.schoolSection.findUnique({
      where: { id },
      include: { _count: { select: { classes: true } } },
    });
    if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    requireSchoolScope(session, section.schoolId);

    // Block deletion if active students exist in this section
    const activeStudents = await prisma.student.count({
      where: { class: { sectionId: id }, status: 'ACTIVE' },
    });
    if (activeStudents > 0) {
      return NextResponse.json({
        error: `Cannot delete section with ${activeStudents} active student(s). Deactivate the section instead.`,
      }, { status: 409 });
    }

    // Soft-delete: deactivate instead of deleting
    await prisma.schoolSection.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ success: true, message: 'Section deactivated successfully' });
  } catch (error: any) {
    console.error('Sections DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete section' }, { status: error.status || 500 });
  }
}

export const dynamic = 'force-dynamic';
