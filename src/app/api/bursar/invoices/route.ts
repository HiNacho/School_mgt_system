import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/bursar/invoices - Retrieve invoices
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const schoolId = session.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    const whereClause: any = {
      schoolId,
      deletedAt: null
    };

    if (studentId) {
      whereClause.studentId = studentId;
    }

    if (status) {
      whereClause.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            passportPhoto: true,
            class: { select: { name: true } },
            arm: { select: { name: true } },
            parent: { select: { firstName: true, lastName: true, phone: true, email: true } }
          }
        },
        session: { select: { name: true } },
        term: { select: { name: true } },
        payments: { where: { deletedAt: null } },
        installments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// POST /api/bursar/invoices - Create bulk or single student invoices
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
      studentId,
      classId,
      sessionId,
      termId,
      dueDate,
      installmentsCount = 1 // number of installment schedules to split into
    } = body;

    if (!sessionId || !termId) {
      return NextResponse.json({ error: 'Session and Term parameters are required' }, { status: 400 });
    }

    const createdInvoices = await prisma.$transaction(async (tx) => {
      let targetStudents: any[] = [];

      // 1. Determine target students
      if (studentId) {
        const stud = await tx.student.findUnique({
          where: { id: studentId, schoolId },
          include: { class: true }
        });
        if (stud) targetStudents.push(stud);
      } else if (classId) {
        targetStudents = await tx.student.findMany({
          where: { classId, schoolId, status: 'ACTIVE' },
          include: { class: true }
        });
      }

      if (targetStudents.length === 0) {
        throw new Error('No active students found matching criteria');
      }

      const invoiceResults: any[] = [];
      const currentYear = new Date().getFullYear();

      // 2. Generate invoice for each student
      for (const student of targetStudents) {
        // Fetch fee structure for class
        const cls = await tx.class.findUnique({
          where: { id: student.classId, schoolId },
          include: { feeStructure: true }
        });

        const struct = cls?.feeStructure;
        if (!struct) {
          throw new Error(`Fee structure not assigned for class: ${student.class.name}. Please configure class fee structure first.`);
        }

        // Calculate totals
        const baseAmount = 
          struct.tuition +
          struct.developmentLevy +
          struct.ict +
          struct.sports +
          struct.books +
          struct.laboratory +
          struct.examination +
          struct.ptaLevy +
          struct.transport +
          struct.boarding +
          struct.hostel +
          struct.uniform +
          struct.miscellaneous;

        // Custom fees addition
        let customSum = 0;
        if (struct.customFees && Array.isArray(struct.customFees)) {
          struct.customFees.forEach((cf: any) => {
            if (cf.amount) customSum += parseFloat(cf.amount) || 0;
          });
        }

        const totalFees = baseAmount + customSum;

        // Apply scholarship and discounts stored on student
        let scholarshipAmt = 0;
        if (student.scholarshipType === 'PERCENTAGE_100') {
          scholarshipAmt = totalFees;
        } else if (student.scholarshipType === 'PERCENTAGE_75') {
          scholarshipAmt = totalFees * 0.75;
        } else if (student.scholarshipType === 'PERCENTAGE_50') {
          scholarshipAmt = totalFees * 0.50;
        } else if (student.scholarshipType === 'PERCENTAGE_25') {
          scholarshipAmt = totalFees * 0.25;
        } else if (student.scholarshipType === 'CUSTOM') {
          scholarshipAmt = student.scholarshipValue || 0;
        }

        let discountAmt = 0;
        if (student.discountType === 'SIBLING') {
          discountAmt = (totalFees - scholarshipAmt) * 0.10; // 10% sibling discount
        } else if (student.discountType === 'STAFF_CHILD') {
          discountAmt = (totalFees - scholarshipAmt) * 0.50; // 50% staff child discount
        } else if (student.discountType === 'EARLY_PAYMENT') {
          discountAmt = (totalFees - scholarshipAmt) * 0.05; // 5% early discount
        } else if (student.discountType === 'MANUAL') {
          discountAmt = student.discountValue || 0;
        }

        const netAmount = Math.max(0, totalFees - scholarshipAmt - discountAmt);

        // Generate invoice number
        const count = await tx.invoice.count({ where: { schoolId } });
        const invoiceNumber = `INV-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            schoolId,
            studentId: student.id,
            invoiceNumber,
            sessionId,
            termId,
            amount: totalFees,
            scholarship: scholarshipAmt,
            discount: discountAmt,
            netAmount,
            paidAmount: 0,
            status: netAmount === 0 ? 'PAID' : 'OUTSTANDING',
            dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days due
            items: {
              feeStructureName: struct.name,
              tuition: struct.tuition,
              developmentLevy: struct.developmentLevy,
              ict: struct.ict,
              sports: struct.sports,
              books: struct.books,
              laboratory: struct.laboratory,
              examination: struct.examination,
              ptaLevy: struct.ptaLevy,
              transport: struct.transport,
              boarding: struct.boarding,
              hostel: struct.hostel,
              uniform: struct.uniform,
              miscellaneous: struct.miscellaneous,
              customFees: struct.customFees
            }
          }
        });

        // Generate installment schedules if requested
        if (installmentsCount > 1 && netAmount > 0) {
          const installmentAmt = parseFloat((netAmount / installmentsCount).toFixed(2));
          const schedules = [];
          for (let i = 0; i < installmentsCount; i++) {
            const installmentDueDate = new Date(invoice.dueDate || Date.now());
            // Stagger due dates monthly
            installmentDueDate.setMonth(installmentDueDate.getMonth() + i);

            schedules.push({
              invoiceId: invoice.id,
              dueDate: installmentDueDate,
              amount: i === installmentsCount - 1 ? parseFloat((netAmount - (installmentAmt * (installmentsCount - 1))).toFixed(2)) : installmentAmt,
              status: 'UNPAID'
            });
          }
          await tx.installmentSchedule.createMany({
            data: schedules
          });
        }

        // Add timeline event
        await tx.studentTimeline.create({
          data: {
            schoolId,
            studentId: student.id,
            eventType: 'RESULT', // Using RESULT as a placeholder for general documents or keep general
            title: 'Invoice Issued',
            description: `Invoice ${invoiceNumber} issued for Term. Amount due: ₦${netAmount.toLocaleString()}`,
            referenceId: invoice.id
          }
        });

        invoiceResults.push(invoice);
      }

      // Log action to financial audit log
      await tx.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'INVOICE_GENERATED',
          details: `Generated ${invoiceResults.length} invoices bulk/single`
        }
      });

      return invoiceResults;
    });

    return NextResponse.json({ success: true, data: createdInvoices });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// DELETE /api/bursar/invoices - Soft delete/archive invoices
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
      const invoice = await tx.invoice.findUnique({
        where: { id, schoolId }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      await tx.invoice.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      await tx.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'INVOICE_DELETED',
          details: `Soft deleted invoice ${invoice.invoiceNumber}`
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Invoice archived successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
