// Grading Scales API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch all grading rules for the current school tenant context
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { gradingType: true }
    });

    if (!school) {
      return NextResponse.json({ error: 'School tenant not found' }, { status: 404 });
    }

    const rules = await prisma.gradingRule.findMany({
      where: { schoolId },
      orderBy: { minScore: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        gradingType: school.gradingType,
        rules
      } 
    });
  } catch (error: any) {
    console.error('Grading GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch grading scales' }, { status: 500 });
  }
}

// 2. POST: Create a new Grading Rule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, grade, minScore, maxScore, interpretation } = body;

    if (!schoolId || !grade || minScore === undefined || maxScore === undefined || !interpretation) {
      return NextResponse.json({ error: 'Missing required grading rule fields' }, { status: 400 });
    }

    const min = parseFloat(minScore);
    const max = parseFloat(maxScore);

    if (isNaN(min) || isNaN(max) || min < 0 || max > 100 || min > max) {
      return NextResponse.json({ error: 'Invalid score boundaries. Boundaries must be between 0 and 100, and Minimum must be less than Maximum.' }, { status: 400 });
    }

    // Check if duplicate grade code exists for this school
    const existing = await prisma.gradingRule.findFirst({
      where: {
        schoolId,
        grade: grade.trim().toUpperCase()
      }
    });

    if (existing) {
      return NextResponse.json({ error: `A grading rule for grade "${grade}" already exists. Edit that rule instead.` }, { status: 400 });
    }

    const newRule = await prisma.gradingRule.create({
      data: {
        schoolId,
        grade: grade.trim().toUpperCase(),
        minScore: min,
        maxScore: max,
        interpretation: interpretation.trim()
      }
    });

    return NextResponse.json({ success: true, data: newRule });
  } catch (error: any) {
    console.error('Grading POST Error:', error);
    return NextResponse.json({ error: 'Failed to initialize grading rule' }, { status: 500 });
  }
}

// 3. PUT: Update an existing Grading Rule boundary
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, schoolId, minScore, maxScore, interpretation } = body;

    if (!id || !schoolId || minScore === undefined || maxScore === undefined || !interpretation) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const min = parseFloat(minScore);
    const max = parseFloat(maxScore);

    if (isNaN(min) || isNaN(max) || min < 0 || max > 100 || min > max) {
      return NextResponse.json({ error: 'Invalid score boundaries. Boundaries must be between 0 and 100, and Minimum must be less than Maximum.' }, { status: 400 });
    }

    // Verify ownership
    const rule = await prisma.gradingRule.findFirst({
      where: { id, schoolId }
    });

    if (!rule) {
      return NextResponse.json({ error: 'Grading rule not found' }, { status: 404 });
    }

    // Update rule
    const updated = await prisma.gradingRule.update({
      where: { id },
      data: {
        minScore: min,
        maxScore: max,
        interpretation: interpretation.trim()
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Grading PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update grading rule' }, { status: 500 });
  }
}

// 4. DELETE: Remove an existing Grading Rule
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const schoolId = searchParams.get('schoolId');

    if (!id || !schoolId) {
      return NextResponse.json({ error: 'Grading Rule ID and School ID are required' }, { status: 400 });
    }

    // Verify ownership
    const rule = await prisma.gradingRule.findFirst({
      where: { id, schoolId }
    });

    if (!rule) {
      return NextResponse.json({ error: 'Grading rule not found within current school boundary' }, { status: 404 });
    }

    // Delete rule
    await prisma.gradingRule.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Grading rule deleted successfully.' });
  } catch (error: any) {
    console.error('Grading DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete grading rule' }, { status: 500 });
  }
}
