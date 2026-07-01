// Cognitive & Affective Domain Behavior Ratings API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

const CATEGORIES = [
  'punctuality',
  'neatness',
  'honesty',
  'politeness',
  'selfControl',
  'attentiveness',
  'reliability',
  'sportsmanship'
];

// 1. GET: Fetch existing ratings for students in a class-arm and term
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const termId = searchParams.get('termId');

    if (!schoolId || !classId || !armId || !termId) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    // Fetch all active students in the class arm
    const students = await prisma.student.findMany({
      where: { schoolId, classId, armId, status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Fetch existing behavior ratings for these students in this term
    const studentIds = students.map(s => s.id);
    const dbRatings = await prisma.behaviorRating.findMany({
      where: {
        schoolId,
        termId,
        studentId: { in: studentIds }
      }
    });

    // Merge and construct response
    const data = students.map(student => {
      // Find database ratings for this student
      const studentRatings = dbRatings.filter(r => r.studentId === student.id);
      
      // Build ratings dictionary, defaulting to 4 if not graded yet
      const ratings: Record<string, number> = {};
      CATEGORIES.forEach(cat => {
        const found = studentRatings.find(r => r.category === cat);
        ratings[cat] = found ? found.rating : 4;
      });

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        ratings
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Behavior GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch behavior ratings' }, { status: 500 });
  }
}

// 2. POST: Batch save behavior ratings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, termId, ratings } = body;

    if (!schoolId || !termId || !ratings || !Array.isArray(ratings)) {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    // Filter valid ratings and perform upserts in a single transaction
    const upsertPromises = ratings
      .filter((r: any) => r.studentId && r.category && typeof r.rating === 'number')
      .map((r: any) => {
        const ratingVal = Math.max(1, Math.min(5, Math.round(r.rating))); // Clamp between 1 and 5
        return prisma.behaviorRating.upsert({
          where: {
            studentId_termId_category: {
              studentId: r.studentId,
              termId,
              category: r.category
            }
          },
          update: {
            rating: ratingVal
          },
          create: {
            schoolId,
            studentId: r.studentId,
            termId,
            category: r.category,
            rating: ratingVal
          }
        });
      });

    await prisma.$transaction(upsertPromises);

    return NextResponse.json({ success: true, message: `Successfully updated ${upsertPromises.length} rating records` });
  } catch (error: any) {
    console.error('Behavior POST Error:', error);
    return NextResponse.json({ error: 'Failed to save behavior ratings' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
