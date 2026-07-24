import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/bursar/fees - List all fee structures
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const schoolId = session.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    if (classId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId, schoolId },
        include: { feeStructure: true }
      });
      return NextResponse.json({ success: true, data: cls?.feeStructure || null });
    }

    const structures = await prisma.feeStructure.findMany({
      where: { schoolId },
      include: { classes: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: structures });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// POST /api/bursar/fees - Create a new fee structure
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const schoolId = session.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    const body = await req.json();
    const {
      name,
      section,
      tuition = 0,
      developmentLevy = 0,
      ict = 0,
      sports = 0,
      books = 0,
      laboratory = 0,
      examination = 0,
      ptaLevy = 0,
      transport = 0,
      boarding = 0,
      hostel = 0,
      uniform = 0,
      miscellaneous = 0,
      customFees = [],
      classIds = [] // Classes to assign this structure to
    } = body;

    if (!name || !section) {
      return NextResponse.json({ error: 'Name and Section are required fields' }, { status: 400 });
    }

    // Create fee structure and link classes in a transaction
    const structure = await prisma.$transaction(async (tx) => {
      const struct = await tx.feeStructure.create({
        data: {
          schoolId,
          name,
          section,
          tuition: parseFloat(tuition) || 0,
          developmentLevy: parseFloat(developmentLevy) || 0,
          ict: parseFloat(ict) || 0,
          sports: parseFloat(sports) || 0,
          books: parseFloat(books) || 0,
          laboratory: parseFloat(laboratory) || 0,
          examination: parseFloat(examination) || 0,
          ptaLevy: parseFloat(ptaLevy) || 0,
          transport: parseFloat(transport) || 0,
          boarding: parseFloat(boarding) || 0,
          hostel: parseFloat(hostel) || 0,
          uniform: parseFloat(uniform) || 0,
          miscellaneous: parseFloat(miscellaneous) || 0,
          customFees: customFees
        }
      });

      // Clear previous assignments for these classes and set the new one
      if (classIds.length > 0) {
        await tx.class.updateMany({
          where: { id: { in: classIds }, schoolId },
          data: { feeStructureId: struct.id }
        });
      }

      // Log action to financial audit log
      await tx.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'FEE_STRUCTURE_CREATED',
          details: `Created fee structure "${name}" for section ${section} with total base amount: ${
            (parseFloat(tuition) || 0) + (parseFloat(developmentLevy) || 0) + (parseFloat(ict) || 0)
          }`
        }
      });

      return struct;
    });

    return NextResponse.json({ success: true, data: structure });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// PUT /api/bursar/fees - Update an existing fee structure
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const schoolId = session.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    const body = await req.json();
    const {
      id,
      name,
      section,
      tuition,
      developmentLevy,
      ict,
      sports,
      books,
      laboratory,
      examination,
      ptaLevy,
      transport,
      boarding,
      hostel,
      uniform,
      miscellaneous,
      customFees,
      classIds = []
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Fee Structure ID is required' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.feeStructure.findUnique({
        where: { id, schoolId }
      });

      if (!existing) {
        throw new Error('Fee Structure not found');
      }

      const struct = await tx.feeStructure.update({
        where: { id },
        data: {
          name: name ?? existing.name,
          section: section ?? existing.section,
          tuition: tuition !== undefined ? parseFloat(tuition) : existing.tuition,
          developmentLevy: developmentLevy !== undefined ? parseFloat(developmentLevy) : existing.developmentLevy,
          ict: ict !== undefined ? parseFloat(ict) : existing.ict,
          sports: sports !== undefined ? parseFloat(sports) : existing.sports,
          books: books !== undefined ? parseFloat(books) : existing.books,
          laboratory: laboratory !== undefined ? parseFloat(laboratory) : existing.laboratory,
          examination: examination !== undefined ? parseFloat(examination) : existing.examination,
          ptaLevy: ptaLevy !== undefined ? parseFloat(ptaLevy) : existing.ptaLevy,
          transport: transport !== undefined ? parseFloat(transport) : existing.transport,
          boarding: boarding !== undefined ? parseFloat(boarding) : existing.boarding,
          hostel: hostel !== undefined ? parseFloat(hostel) : existing.hostel,
          uniform: uniform !== undefined ? parseFloat(uniform) : existing.uniform,
          miscellaneous: miscellaneous !== undefined ? parseFloat(miscellaneous) : existing.miscellaneous,
          customFees: customFees !== undefined ? customFees : existing.customFees
        }
      });

      // Reset old classes links and assign new ones
      await tx.class.updateMany({
        where: { feeStructureId: id, schoolId },
        data: { feeStructureId: null }
      });

      if (classIds.length > 0) {
        await tx.class.updateMany({
          where: { id: { in: classIds }, schoolId },
          data: { feeStructureId: id }
        });
      }

      await tx.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'FEE_STRUCTURE_UPDATED',
          details: `Updated fee structure "${struct.name}"`
        }
      });

      return struct;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// DELETE /api/bursar/fees - Delete a fee structure
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const schoolId = session.schoolId;

    if (!id || !schoolId) {
      return NextResponse.json({ error: 'ID and School context required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.feeStructure.findUnique({
        where: { id, schoolId }
      });

      if (!existing) {
        throw new Error('Fee Structure not found');
      }

      // Unlink classes
      await tx.class.updateMany({
        where: { feeStructureId: id, schoolId },
        data: { feeStructureId: null }
      });

      // Delete structure
      await tx.feeStructure.delete({
        where: { id }
      });

      await tx.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'FEE_STRUCTURE_DELETED',
          details: `Deleted fee structure "${existing.name}"`
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Fee Structure deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
