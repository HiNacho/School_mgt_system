import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/bursar/payments - Retrieve payment entries
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const invoiceId = searchParams.get('invoiceId');
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

    if (invoiceId) {
      whereClause.invoiceId = invoiceId;
    }

    const payments = await prisma.studentPayment.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            class: { select: { name: true } },
            arm: { select: { name: true } }
          }
        },
        invoice: { select: { invoiceNumber: true, netAmount: true, paidAmount: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// POST /api/bursar/payments - Record a manual fee payment or confirm Flutterwave
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
      invoiceId,
      amount,
      paymentMethod,
      referenceNumber,
      bankName,
      paymentDate,
      notes,
      tellerImage,
      status = 'VERIFIED'
    } = body;

    if (!studentId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Student ID, Amount, and Payment Method are required' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Fetch student
      const student = await tx.student.findUnique({
        where: { id: studentId, schoolId }
      });
      if (!student) throw new Error('Student not found');

      // 2. Generate Receipt number
      const count = await tx.studentPayment.count({ where: { schoolId } });
      const receiptNumber = `REC-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

      // 3. Record the transaction
      const txn = await tx.studentPayment.create({
        data: {
          schoolId,
          studentId,
          invoiceId,
          receiptNumber,
          amount: parseFloat(amount),
          paymentMethod,
          referenceNumber,
          bankName,
          notes,
          tellerImage,
          status,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          recordedById: session.userId,
          verifiedById: status === 'VERIFIED' ? session.userId : null
        }
      });

      // 4. Update corresponding invoice balance if linked
      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId, schoolId }
        });

        if (invoice) {
          const newPaidAmount = invoice.paidAmount + parseFloat(amount);
          let newStatus = 'OUTSTANDING';

          if (newPaidAmount >= invoice.netAmount) {
            newStatus = 'PAID';
          } else if (newPaidAmount > 0) {
            newStatus = 'PARTIALLY_PAID';
          }

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus
            }
          });

          // Stagger installment schedule flags as paid if applicable
          if (newStatus === 'PAID') {
            await tx.installmentSchedule.updateMany({
              where: { invoiceId, status: 'UNPAID' },
              data: { status: 'PAID' }
            });
          } else {
            // Mark installment elements paid sequentially
            const schedules = await tx.installmentSchedule.findMany({
              where: { invoiceId },
              orderBy: { dueDate: 'asc' }
            });

            let runningPaid = newPaidAmount;
            for (const schedule of schedules) {
              if (runningPaid >= schedule.amount) {
                await tx.installmentSchedule.update({
                  where: { id: schedule.id },
                  data: { status: 'PAID' }
                });
                runningPaid -= schedule.amount;
              } else if (runningPaid > 0) {
                await tx.installmentSchedule.update({
                  where: { id: schedule.id },
                  data: { status: 'UNPAID' } // partially paid is marked unpaid or overdue depending on date
                });
                runningPaid = 0;
              }
            }
          }
        }
      }

      // Check if student has outstanding debts. If not, toggle feesPaid to true
      const unpaidInvoices = await tx.invoice.count({
        where: {
          studentId,
          schoolId,
          deletedAt: null,
          status: { in: ['OUTSTANDING', 'PARTIALLY_PAID'] }
        }
      });

      if (unpaidInvoices === 0) {
        await tx.student.update({
          where: { id: studentId },
          data: { feesPaid: true }
        });
      } else {
        await tx.student.update({
          where: { id: studentId },
          data: { feesPaid: false }
        });
      }

      // Add timeline event
      await tx.studentTimeline.create({
        data: {
          schoolId,
          studentId,
          eventType: 'RESULT',
          title: 'Payment Recorded',
          description: `Fee payment of ₦${parseFloat(amount).toLocaleString()} received via ${paymentMethod}. Receipt issued: ${receiptNumber}`,
          referenceId: txn.id
        }
      });

      // Log action to financial audit log
      await tx.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'PAYMENT_RECORDED',
          details: `Recorded payment of ₦${amount} for student ${student.firstName} ${student.lastName}. Receipt: ${receiptNumber}`
        }
      });

      return txn;
    });

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// DELETE /api/bursar/payments - Soft delete/archive payment records (adjusts invoice balances)
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
      const payment = await tx.studentPayment.findUnique({
        where: { id, schoolId }
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      await tx.studentPayment.update({
        where: { id },
        data: { deletedAt: new Date() }
      });

      // Revert invoice paid amount
      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId, schoolId }
        });

        if (invoice) {
          const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
          let newStatus = 'OUTSTANDING';

          if (newPaidAmount >= invoice.netAmount) {
            newStatus = 'PAID';
          } else if (newPaidAmount > 0) {
            newStatus = 'PARTIALLY_PAID';
          }

          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: newPaidAmount,
              status: newStatus
            }
          });

          // Reset student feesPaid flag if needed
          await tx.student.update({
            where: { id: payment.studentId },
            data: { feesPaid: false }
          });
        }
      }

      await tx.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'PAYMENT_DELETED',
          details: `Soft deleted payment transaction ${payment.receiptNumber} of ₦${payment.amount}`
        }
      });
    });

    return NextResponse.json({ success: true, message: 'Payment archived and balances recalculated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
