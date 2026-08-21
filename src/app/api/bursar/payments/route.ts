import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

// GET /api/bursar/payments - Retrieve payment entries with analytics and filters
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR', 'HEAD_TEACHER']);
    
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const invoiceId = searchParams.get('invoiceId');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const classId = searchParams.get('classId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    
    let schoolId = session.schoolId || searchParams.get('schoolId');
    if (session.role === 'SUPER_ADMIN' && searchParams.get('schoolId')) {
      schoolId = searchParams.get('schoolId');
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    const whereClause: any = {
      schoolId,
      deletedAt: null
    };

    if (studentId) whereClause.studentId = studentId;
    if (invoiceId) whereClause.invoiceId = invoiceId;

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      whereClause.paymentMethod = paymentMethod;
    }

    if (classId && classId !== 'ALL') {
      whereClause.student = { classId };
    }

    if (startDate || endDate) {
      whereClause.paymentDate = {};
      if (startDate) whereClause.paymentDate.gte = new Date(startDate);
      if (endDate) whereClause.paymentDate.lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { receiptNumber: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { flutterwaveTransactionId: { contains: q, mode: 'insensitive' } },
        { student: { firstName: { contains: q, mode: 'insensitive' } } },
        { student: { lastName: { contains: q, mode: 'insensitive' } } },
        { student: { admissionNumber: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Consolidated execution for payments list + financial summary metrics
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [payments, summaryGroups, todayPayments, refundsCount] = await Promise.all([
      prisma.studentPayment.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              admissionNumber: true,
              class: { select: { id: true, name: true } },
              arm: { select: { id: true, name: true } }
            }
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              netAmount: true,
              paidAmount: true,
              status: true
            }
          },
          parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } }
        },
        orderBy: { paymentDate: 'desc' }
      }),

      // Grouped metrics for School Dashboard
      prisma.studentPayment.groupBy({
        by: ['status'],
        where: { schoolId, deletedAt: null },
        _sum: { amount: true, grossAmount: true, platformFee: true, schoolAmount: true },
        _count: { id: true }
      }),

      // Today's collection
      prisma.studentPayment.aggregate({
        where: {
          schoolId,
          deletedAt: null,
          status: { in: ['VERIFIED', 'SUCCESSFUL'] },
          paymentDate: { gte: startOfToday }
        },
        _sum: { amount: true }
      }),

      // Refunds count & total
      prisma.schoolFeeRefund.aggregate({
        where: { schoolId, status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    // Calculate Summary Metrics
    let totalCollected = 0;
    let successfulCount = 0;
    let pendingAmount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const group of summaryGroups) {
      if (['VERIFIED', 'SUCCESSFUL'].includes(group.status)) {
        totalCollected += group._sum.amount || 0;
        successfulCount += group._count.id || 0;
      } else if (['PENDING', 'PROCESSING', 'UNDER_REVIEW'].includes(group.status)) {
        pendingAmount += group._sum.amount || 0;
        pendingCount += group._count.id || 0;
      } else if (['FAILED', 'CANCELLED'].includes(group.status)) {
        failedCount += group._count.id || 0;
      }
    }

    const todayCollection = todayPayments._sum.amount || 0;
    const refundedAmount = refundsCount._sum.amount || 0;

    return NextResponse.json({
      success: true,
      data: payments,
      summary: {
        totalCollected,
        todayCollection,
        pendingAmount,
        pendingCount,
        successfulCount,
        failedCount,
        refundedAmount,
        refundsCount: refundsCount._count.id || 0
      }
    });

  } catch (error: any) {
    console.error('Bursar Payments GET Error:', error);
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
