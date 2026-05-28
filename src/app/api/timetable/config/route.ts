// Timetable Configuration API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    // Attempt to fetch settings, lazy create with default params if absent
    let settings = await prisma.timetableSetting.findUnique({
      where: { schoolId }
    });

    if (!settings) {
      settings = await prisma.timetableSetting.create({
        data: {
          schoolId,
          schoolDays: "Monday,Tuesday,Wednesday,Thursday,Friday",
          periodsPerDay: 6,
          periodDuration: 40,
          startTime: "08:00",
          breakAfter: 3,
          breakDuration: 30,
          timetableName: "2025/2026 First Term Timetable",
          timeFormat: "12-hour",
          periodsConfig: "",
          specialPeriods: "",
          timetableRules: ""
        }
      });
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Timetable Config GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve timetable configurations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      schoolId, 
      schoolDays, 
      periodsPerDay, 
      periodDuration, 
      startTime, 
      breakAfter, 
      breakDuration,
      timetableName,
      timeFormat,
      periodsConfig,
      specialPeriods,
      timetableRules
    } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const settings = await prisma.timetableSetting.upsert({
      where: { schoolId },
      update: {
        schoolDays: schoolDays || "Monday,Tuesday,Wednesday,Thursday,Friday",
        periodsPerDay: Number(periodsPerDay) || 6,
        periodDuration: Number(periodDuration) || 40,
        startTime: startTime || "08:00",
        breakAfter: Number(breakAfter) || 3,
        breakDuration: Number(breakDuration) || 30,
        timetableName: timetableName || "2025/2026 First Term Timetable",
        timeFormat: timeFormat || "12-hour",
        periodsConfig: periodsConfig !== undefined ? periodsConfig : undefined,
        specialPeriods: specialPeriods !== undefined ? specialPeriods : undefined,
        timetableRules: timetableRules !== undefined ? timetableRules : undefined
      },
      create: {
        schoolId,
        schoolDays: schoolDays || "Monday,Tuesday,Wednesday,Thursday,Friday",
        periodsPerDay: Number(periodsPerDay) || 6,
        periodDuration: Number(periodDuration) || 40,
        startTime: startTime || "08:00",
        breakAfter: Number(breakAfter) || 3,
        breakDuration: Number(breakDuration) || 30,
        timetableName: timetableName || "2025/2026 First Term Timetable",
        timeFormat: timeFormat || "12-hour",
        periodsConfig: periodsConfig || "",
        specialPeriods: specialPeriods || "",
        timetableRules: timetableRules || ""
      }
    });

    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Timetable Config POST Error:', error);
    return NextResponse.json({ error: 'Failed to save timetable configurations' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
