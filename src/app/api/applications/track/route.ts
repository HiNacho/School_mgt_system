import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get('ref');

    if (!ref) {
      return NextResponse.json({ error: 'Reference Number parameter is required' }, { status: 400 });
    }

    const application = await prisma.pendingApplication.findUnique({
      where: { referenceNumber: ref.trim().toUpperCase() },
      include: {
        school: {
          select: {
            name: true,
            slug: true,
            logoUrl: true
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: `No application found with Reference Number '${ref}'. Please verify and try again.` }, { status: 404 });
    }

    // Construct timeline steps
    const timeline = [
      { step: 'Submitted', label: 'Application Submitted', completed: true, date: application.submittedAt },
      { step: 'Verified', label: 'Documents & Information Verified', completed: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'].includes(application.status), date: application.updatedAt },
      { step: 'Review', label: 'Admin Review & Decision', completed: ['APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'].includes(application.status), date: application.updatedAt },
      { step: 'Completed', label: 'Registration & Account Provisioning', completed: application.status === 'APPROVED', date: application.updatedAt }
    ];

    return NextResponse.json({
      success: true,
      data: {
        id: application.id,
        referenceNumber: application.referenceNumber,
        type: application.type,
        status: application.status,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        applicantPhone: application.applicantPhone,
        applyingClass: application.applyingClass,
        department: application.department,
        correctionNotes: application.correctionNotes,
        rejectionReason: application.status === 'REJECTED' ? application.rejectionReason : null,
        submittedAt: application.submittedAt,
        updatedAt: application.updatedAt,
        schoolName: application.school.name,
        schoolSlug: application.school.slug,
        schoolLogoUrl: application.school.logoUrl,
        timeline,
        parsedData: JSON.parse(application.applicationData || '{}')
      }
    });

  } catch (error: any) {
    console.error('Track Application GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to track application' }, { status: 500 });
  }
}
