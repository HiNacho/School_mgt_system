// Greedy Backtracking Timetable Generator Engine API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

interface ClassArmUnit {
  classId: string;
  armId: string;
  name: string;
}

interface RequirementWithDetails {
  id: string;
  schoolId: string;
  classId: string;
  armId: string;
  subjectId: string;
  teacherId: string;
  periodsPerWeek: number;
  doublePeriod: boolean;
  preferredDays: string;
  restrictedDays: string;
  combinedWithArmId: string;
  isSplit: boolean;
  subject: {
    id: string;
    name: string;
    code: string;
    restrictions: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    // 1. Fetch Timetable Settings
    const settings = await prisma.timetableSetting.findUnique({
      where: { schoolId }
    });

    const activeDays = settings?.schoolDays 
      ? settings.schoolDays.split(',').map(d => d.trim()) 
      : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const periodsPerDay = settings?.periodsPerDay || 6;

    // Parse Special Periods
    let specialPeriodsList: any[] = [];
    if (settings?.specialPeriods) {
      try {
        specialPeriodsList = JSON.parse(settings.specialPeriods);
      } catch (e) {
        console.error('Error parsing special periods JSON:', e);
      }
    }

    // 2. Fetch All Classes and Arms
    const allClasses = await prisma.class.findMany({
      where: { schoolId },
      include: { arms: true }
    });

    const classArmUnits: ClassArmUnit[] = [];
    for (const cls of allClasses) {
      for (const arm of cls.arms) {
        classArmUnits.push({
          classId: cls.id,
          armId: arm.id,
          name: `${cls.name} - ${arm.name}`
        });
      }
    }

    if (classArmUnits.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No classes and arms are configured. Please create classes first.'
      }, { status: 400 });
    }

    // 3. Fetch All Teacher Profiles
    const teacherProfilesRaw = await prisma.teacherProfile.findMany({
      where: { schoolId }
    });

    const teacherProfiles = new Map<string, any>();
    for (const p of teacherProfilesRaw) {
      teacherProfiles.set(p.userId, {
        maxPeriodsPerDay: p.maxPeriodsPerDay,
        maxPeriodsPerWeek: p.maxPeriodsPerWeek,
        consecutiveLimit: p.consecutiveLimit,
        unavailableDays: p.unavailableDays ? p.unavailableDays.split(',').map(d => d.trim()).filter(Boolean) : [],
        unavailableSlots: p.unavailableSlots ? p.unavailableSlots.split(',').map(s => s.trim()).filter(Boolean) : []
      });
    }

    // 4. Fetch All Allocations/Requirements
    const requirements = await prisma.timetableRequirement.findMany({
      where: { schoolId },
      include: {
        subject: true,
        teacher: true
      }
    }) as unknown as RequirementWithDetails[];

    if (requirements.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No subject allocations configured. Please assign subjects to teachers first.'
      }, { status: 400 });
    }

    // 5. Fetch Existing Locked Slots to Freeze and Schedule Around Them
    const lockedSlots = await prisma.timetableSlot.findMany({
      where: { schoolId, isLocked: true }
    });

    // Pre-compute teacher total weekly demand (tightness)
    const teacherTotalDemand = new Map<string, number>();
    for (const req of requirements) {
      teacherTotalDemand.set(req.teacherId, (teacherTotalDemand.get(req.teacherId) || 0) + req.periodsPerWeek);
    }

    // --- Core Backtracking Multi-Pass Solver with Random Restarts ---
    let bestSlotsToCreate: any[] = [];
    let bestUnassigned: any[] = [];
    let bestUnassignedCount = Infinity;

    const maxPasses = 100;

    for (let pass = 0; pass < maxPasses; pass++) {
      // Setup tracking variables for this pass
      const classSlots = new Map<string, string>(); // classId_armId_day_period -> subjectId
      const teacherSlots = new Map<string, string>(); // teacherId_day_period -> classId_armId
      const teacherDailyPeriods = new Map<string, number>(); // teacherId_day -> count
      const teacherWeeklyPeriods = new Map<string, number>(); // teacherId -> count
      const subjectDailyPeriods = new Map<string, number>(); // classId_armId_subjectId_day -> count

      const slotsToCreateThisPass: any[] = [];
      const unassignedThisPass: any[] = [];

      // --- Pre-populate tracking maps with Locked Slots ---
      for (const slot of lockedSlots) {
        const classSlotKey = `${slot.classId}_${slot.armId}_${slot.day}_${slot.periodNumber}`;
        const teacherSlotKey = `${slot.teacherId}_${slot.day}_${slot.periodNumber}`;
        const teacherDayKey = `${slot.teacherId}_${slot.day}`;
        const subjectDayKey = `${slot.classId}_${slot.armId}_${slot.subjectId}_${slot.day}`;

        classSlots.set(classSlotKey, slot.subjectId);
        teacherSlots.set(teacherSlotKey, `${slot.classId}_${slot.armId}`);
        
        teacherDailyPeriods.set(teacherDayKey, (teacherDailyPeriods.get(teacherDayKey) || 0) + 1);
        teacherWeeklyPeriods.set(slot.teacherId, (teacherWeeklyPeriods.get(slot.teacherId) || 0) + 1);
        subjectDailyPeriods.set(subjectDayKey, (subjectDailyPeriods.get(subjectDayKey) || 0) + 1);
      }

      // --- Pre-populate tracking maps with Special School Periods ---
      for (const spec of specialPeriodsList) {
        const { day, periodNumber, label, applyTo } = spec;
        const pNum = Number(periodNumber);
        
        for (const unit of classArmUnits) {
          if (applyTo === 'all' || applyTo === `${unit.classId}_${unit.armId}`) {
            const classSlotKey = `${unit.classId}_${unit.armId}_${day}_${pNum}`;
            classSlots.set(classSlotKey, `__SPECIAL__:${label}`);
          }
        }
      }

      const currentClassArmUnits = [...classArmUnits];
      if (pass > 0) {
        currentClassArmUnits.sort(() => Math.random() - 0.5);
      }

      const scheduledCombinedKeys = new Set<string>();

      for (const unit of currentClassArmUnits) {
        const unitRequirements = requirements.filter(
          r => r.classId === unit.classId && r.armId === unit.armId
        );

        // Pre-compute locked slots counts for each requirement
        const unitRequirementsAdjusted = unitRequirements.map(req => {
          const lockedCount = lockedSlots.filter(
            ls => ls.classId === unit.classId && 
                  ls.armId === unit.armId && 
                  ls.subjectId === req.subjectId
          ).length;
          return {
            ...req,
            periodsNeeded: Math.max(0, req.periodsPerWeek - lockedCount)
          };
        });

        // Sort requirements: Prioritize subjects with double periods, larger periods demand, and tighter teacher loads
        unitRequirementsAdjusted.sort((a, b) => {
          const loadA = teacherTotalDemand.get(a.teacherId) || 0;
          const loadB = teacherTotalDemand.get(b.teacherId) || 0;
          
          let scoreA = (a.periodsNeeded * 15 + loadA) + (a.doublePeriod ? 100 : 0);
          let scoreB = (b.periodsNeeded * 15 + loadB) + (b.doublePeriod ? 100 : 0);
          
          if (pass > 0) {
            scoreA += Math.random() * 5.0;
            scoreB += Math.random() * 5.0;
          }
          return scoreB - scoreA;
        });

        for (const req of unitRequirementsAdjusted) {
          const { subjectId, teacherId, periodsNeeded, doublePeriod, preferredDays, restrictedDays, combinedWithArmId } = req;
          if (periodsNeeded <= 0) continue;

          const combinedKey = `${unit.classId}_${unit.armId}_${combinedWithArmId}_${subjectId}`;
          const reverseCombinedKey = `${unit.classId}_${combinedWithArmId}_${unit.armId}_${subjectId}`;
          if (scheduledCombinedKeys.has(combinedKey) || scheduledCombinedKeys.has(reverseCombinedKey)) {
            continue;
          }

          const profile = teacherProfiles.get(teacherId) || {
            maxPeriodsPerDay: 5,
            maxPeriodsPerWeek: 20,
            consecutiveLimit: 3,
            unavailableDays: [],
            unavailableSlots: []
          };

          let subjectRules: any = {};
          if (req.subject.restrictions) {
            try {
              subjectRules = JSON.parse(req.subject.restrictions);
            } catch (e) {}
          }

          const blockedPeriods = subjectRules.blockedPeriods || [];
          const preferredPeriods = subjectRules.preferredPeriods || [];

          // Handle double periods
          let remainingPeriods = periodsNeeded;
          let doublePeriodsPlaced = 0;

          if (doublePeriod && remainingPeriods >= 2) {
            const doubleTarget = Math.floor(remainingPeriods / 2);
            for (let d = 0; d < doubleTarget; d++) {
              let placedDouble = false;
              let bestDoubleSlot = null;
              let highestDoubleScore = -Infinity;

              for (const day of activeDays) {
                if (restrictedDays && restrictedDays.includes(day)) continue;
                if (profile.unavailableDays.includes(day)) continue;

                for (let pNum = 1; pNum < periodsPerDay; pNum++) {
                  const pNumNext = pNum + 1;

                  if (blockedPeriods.includes(pNum) || blockedPeriods.includes(pNumNext)) continue;

                  const classKey1 = `${unit.classId}_${unit.armId}_${day}_${pNum}`;
                  const classKey2 = `${unit.classId}_${unit.armId}_${day}_${pNumNext}`;
                  
                  const teachKey1 = `${teacherId}_${day}_${pNum}`;
                  const teachKey2 = `${teacherId}_${day}_${pNumNext}`;

                  if (classSlots.has(classKey1) || classSlots.has(classKey2)) continue;
                  if (teacherSlots.has(teachKey1) || teacherSlots.has(teachKey2)) continue;

                  if (profile.unavailableSlots.includes(`${day}_${pNum}`) || profile.unavailableSlots.includes(`${day}_${pNumNext}`)) continue;

                  let combinedClassKey1 = '';
                  let combinedClassKey2 = '';
                  if (combinedWithArmId) {
                    combinedClassKey1 = `${unit.classId}_${combinedWithArmId}_${day}_${pNum}`;
                    combinedClassKey2 = `${unit.classId}_${combinedWithArmId}_${day}_${pNumNext}`;
                    if (classSlots.has(combinedClassKey1) || classSlots.has(combinedClassKey2)) continue;
                  }

                  const teacherDayKey = `${teacherId}_${day}`;
                  const currentDaily = teacherDailyPeriods.get(teacherDayKey) || 0;
                  if (currentDaily + 2 > profile.maxPeriodsPerDay) continue;

                  const currentWeekly = teacherWeeklyPeriods.get(teacherId) || 0;
                  if (currentWeekly + 2 > profile.maxPeriodsPerWeek) continue;

                  const subjectDayKey = `${unit.classId}_${unit.armId}_${subjectId}_${day}`;
                  const currentSubCount = subjectDailyPeriods.get(subjectDayKey) || 0;
                  if (currentSubCount + 2 > 2) continue;

                  const daySchedule = new Array(periodsPerDay).fill(false);
                  for (let k = 1; k <= periodsPerDay; k++) {
                    if (teacherSlots.has(`${teacherId}_${day}_${k}`) || k === pNum || k === pNumNext) {
                      daySchedule[k - 1] = true;
                    }
                  }
                  
                  let maxConsec = 0;
                  let currConsec = 0;
                  for (const sched of daySchedule) {
                    if (sched) {
                      currConsec++;
                      if (currConsec > maxConsec) maxConsec = currConsec;
                    } else {
                      currConsec = 0;
                    }
                  }
                  if (maxConsec > profile.consecutiveLimit) continue;

                  let dScore = 500;
                  if (preferredDays && preferredDays.includes(day)) dScore += 150;
                  if (preferredPeriods.includes(pNum)) dScore += 50;
                  if (preferredPeriods.includes(pNumNext)) dScore += 50;
                  dScore += (profile.maxPeriodsPerDay - currentDaily) * 15;

                  if (dScore > highestDoubleScore) {
                    highestDoubleScore = dScore;
                    bestDoubleSlot = { day, p1: pNum, p2: pNumNext };
                  }
                }
              }

              if (bestDoubleSlot) {
                const { day, p1, p2 } = bestDoubleSlot;
                
                const classKey1 = `${unit.classId}_${unit.armId}_${day}_${p1}`;
                const classKey2 = `${unit.classId}_${unit.armId}_${day}_${p2}`;
                classSlots.set(classKey1, subjectId);
                classSlots.set(classKey2, subjectId);

                const teachKey1 = `${teacherId}_${day}_${p1}`;
                const teachKey2 = `${teacherId}_${day}_${p2}`;
                teacherSlots.set(teachKey1, `${unit.classId}_${unit.armId}`);
                teacherSlots.set(teachKey2, `${unit.classId}_${unit.armId}`);

                teacherDailyPeriods.set(`${teacherId}_${day}`, (teacherDailyPeriods.get(`${teacherId}_${day}`) || 0) + 2);
                teacherWeeklyPeriods.set(teacherId, (teacherWeeklyPeriods.get(teacherId) || 0) + 2);
                
                const subjectDayKey = `${unit.classId}_${unit.armId}_${subjectId}_${day}`;
                subjectDailyPeriods.set(subjectDayKey, (subjectDailyPeriods.get(subjectDayKey) || 0) + 2);

                slotsToCreateThisPass.push({
                  schoolId, classId: unit.classId, armId: unit.armId, subjectId, teacherId, day, periodNumber: p1, isLocked: false
                });
                slotsToCreateThisPass.push({
                  schoolId, classId: unit.classId, armId: unit.armId, subjectId, teacherId, day, periodNumber: p2, isLocked: false
                });

                if (combinedWithArmId) {
                  const combinedClassKey1 = `${unit.classId}_${combinedWithArmId}_${day}_${p1}`;
                  const combinedClassKey2 = `${unit.classId}_${combinedWithArmId}_${day}_${p2}`;
                  classSlots.set(combinedClassKey1, subjectId);
                  classSlots.set(combinedClassKey2, subjectId);

                  slotsToCreateThisPass.push({
                    schoolId, classId: unit.classId, armId: combinedWithArmId, subjectId, teacherId, day, periodNumber: p1, isLocked: false
                  });
                  slotsToCreateThisPass.push({
                    schoolId, classId: unit.classId, armId: combinedWithArmId, subjectId, teacherId, day, periodNumber: p2, isLocked: false
                  });
                }

                remainingPeriods -= 2;
                placedDouble = true;
              }

              if (!placedDouble) {
                break;
              }
            }
          }

          // Schedule remaining single periods
          for (let p = 0; p < remainingPeriods; p++) {
            let bestSlot = null;
            let highestScore = -Infinity;

            for (const day of activeDays) {
              if (restrictedDays && restrictedDays.includes(day)) continue;
              if (profile.unavailableDays.includes(day)) continue;

              for (let periodNum = 1; periodNum <= periodsPerDay; periodNum++) {
                if (blockedPeriods.includes(periodNum)) continue;

                const classSlotKey = `${unit.classId}_${unit.armId}_${day}_${periodNum}`;
                const teacherSlotKey = `${teacherId}_${day}_${periodNum}`;

                if (classSlots.has(classSlotKey)) continue;
                if (teacherSlots.has(teacherSlotKey)) continue;

                if (profile.unavailableSlots.includes(`${day}_${periodNum}`)) continue;

                let combinedClassKey = '';
                if (combinedWithArmId) {
                  combinedClassKey = `${unit.classId}_${combinedWithArmId}_${day}_${periodNum}`;
                  if (classSlots.has(combinedClassKey)) continue;
                }

                const teacherDayKey = `${teacherId}_${day}`;
                const currentDailyCount = teacherDailyPeriods.get(teacherDayKey) || 0;
                if (currentDailyCount >= profile.maxPeriodsPerDay) continue;

                const currentWeeklyCount = teacherWeeklyPeriods.get(teacherId) || 0;
                if (currentWeeklyCount >= profile.maxPeriodsPerWeek) continue;

                const subjectDayKey = `${unit.classId}_${unit.armId}_${subjectId}_${day}`;
                const currentSubjectDayCount = subjectDailyPeriods.get(subjectDayKey) || 0;
                if (currentSubjectDayCount >= 2) continue;

                const daySchedule = new Array(periodsPerDay).fill(false);
                for (let k = 1; k <= periodsPerDay; k++) {
                  if (teacherSlots.has(`${teacherId}_${day}_${k}`) || k === periodNum) {
                    daySchedule[k - 1] = true;
                  }
                }
                
                let maxConsecutive = 0;
                let currentConsecutive = 0;
                for (const scheduled of daySchedule) {
                  if (scheduled) {
                    currentConsecutive++;
                    if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
                  } else {
                    currentConsecutive = 0;
                  }
                }
                if (maxConsecutive > profile.consecutiveLimit) continue;

                let score = 0;
                if (currentSubjectDayCount === 0) score += 120;
                if (preferredDays && preferredDays.includes(day)) score += 80;
                if (preferredPeriods.includes(periodNum)) score += 60;
                score += (profile.maxPeriodsPerDay - currentDailyCount) * 10;
                score += (periodsPerDay - periodNum) * 2;

                if (score > highestScore) {
                  highestScore = score;
                  bestSlot = { day, periodNum };
                }
              }
            }

            if (bestSlot) {
              const { day, periodNum } = bestSlot;
              const classSlotKey = `${unit.classId}_${unit.armId}_${day}_${periodNum}`;
              const teacherSlotKey = `${teacherId}_${day}_${periodNum}`;

              classSlots.set(classSlotKey, subjectId);
              teacherSlots.set(teacherSlotKey, `${unit.classId}_${unit.armId}`);
              
              teacherDailyPeriods.set(`${teacherId}_${day}`, (teacherDailyPeriods.get(`${teacherId}_${day}`) || 0) + 1);
              teacherWeeklyPeriods.set(teacherId, (teacherWeeklyPeriods.get(teacherId) || 0) + 1);
              
              const subjectDayKey = `${unit.classId}_${unit.armId}_${subjectId}_${day}`;
              subjectDailyPeriods.set(subjectDayKey, (subjectDailyPeriods.get(subjectDayKey) || 0) + 1);

              slotsToCreateThisPass.push({
                schoolId, classId: unit.classId, armId: unit.armId, subjectId, teacherId, day, periodNumber: periodNum, isLocked: false
              });

              if (combinedWithArmId) {
                const combinedClassKey = `${unit.classId}_${combinedWithArmId}_${day}_${periodNum}`;
                classSlots.set(combinedClassKey, subjectId);

                slotsToCreateThisPass.push({
                  schoolId, classId: unit.classId, armId: combinedWithArmId, subjectId, teacherId, day, periodNumber: periodNum, isLocked: false
                });
              }
            } else {
              // --- 1-STEP LOOKAHEAD SWAP BACKTRACKER ---
              // Try to vacate a locked/busy slot by shifting its current non-locked occupant to a free alternative slot.
              let swapped = false;
              
              for (const day of activeDays) {
                if (restrictedDays && restrictedDays.includes(day)) continue;
                if (profile.unavailableDays.includes(day)) continue;

                for (let periodNum = 1; periodNum <= periodsPerDay; periodNum++) {
                  if (blockedPeriods.includes(periodNum)) continue;

                  const classSlotKey = `${unit.classId}_${unit.armId}_${day}_${periodNum}`;
                  const occupantId = classSlots.get(classSlotKey);
                  if (!occupantId || occupantId.startsWith('__SPECIAL__')) continue;

                  // Find the occupant slot object in slotsToCreateThisPass
                  const occupantIndex = slotsToCreateThisPass.findIndex(
                    s => s.classId === unit.classId && s.armId === unit.armId && s.day === day && s.periodNumber === periodNum
                  );
                  if (occupantIndex === -1) continue;

                  const occupantSlot = slotsToCreateThisPass[occupantIndex];
                  const occupantProfile = teacherProfiles.get(occupantSlot.teacherId) || {
                    maxPeriodsPerDay: 5, maxPeriodsPerWeek: 20, consecutiveLimit: 3, unavailableDays: [], unavailableSlots: []
                  };

                  let occupantNewSlot = null;

                  // Find a free slot elsewhere for this occupant
                  for (const oDay of activeDays) {
                    if (occupantProfile.unavailableDays.includes(oDay)) continue;

                    for (let oPNum = 1; oPNum <= periodsPerDay; oPNum++) {
                      const oClassKey = `${unit.classId}_${unit.armId}_${oDay}_${oPNum}`;
                      const oTeachKey = `${occupantSlot.teacherId}_${oDay}_${oPNum}`;

                      if (classSlots.has(oClassKey)) continue;
                      if (teacherSlots.has(oTeachKey)) continue;
                      if (occupantProfile.unavailableSlots.includes(`${oDay}_${oPNum}`)) continue;

                      // Found a perfect vacate slot!
                      occupantNewSlot = { day: oDay, periodNum: oPNum };
                      break;
                    }
                    if (occupantNewSlot) break;
                  }

                  // Perform swap if we can vacate the slot
                  if (occupantNewSlot) {
                    // Remove occupant from current slot
                    classSlots.delete(classSlotKey);
                    teacherSlots.delete(`${occupantSlot.teacherId}_${day}_${periodNum}`);
                    teacherDailyPeriods.set(`${occupantSlot.teacherId}_${day}`, (teacherDailyPeriods.get(`${occupantSlot.teacherId}_${day}`) || 0) - 1);

                    // Place occupant in their new slot
                    const newClassKey = `${unit.classId}_${unit.armId}_${occupantNewSlot.day}_${occupantNewSlot.periodNum}`;
                    const newTeachKey = `${occupantSlot.teacherId}_${occupantNewSlot.day}_${occupantNewSlot.periodNum}`;
                    
                    classSlots.set(newClassKey, occupantSlot.subjectId);
                    teacherSlots.set(newTeachKey, `${unit.classId}_${unit.armId}`);
                    teacherDailyPeriods.set(`${occupantSlot.teacherId}_${occupantNewSlot.day}`, (teacherDailyPeriods.get(`${occupantSlot.teacherId}_${occupantNewSlot.day}`) || 0) + 1);

                    occupantSlot.day = occupantNewSlot.day;
                    occupantSlot.periodNumber = occupantNewSlot.periodNum;

                    // Place the unassigned requirement in the now vacated slot
                    classSlots.set(classSlotKey, subjectId);
                    teacherSlots.set(`${teacherId}_${day}_${periodNum}`, `${unit.classId}_${unit.armId}`);
                    teacherDailyPeriods.set(`${teacherId}_${day}`, (teacherDailyPeriods.get(`${teacherId}_${day}`) || 0) + 1);
                    teacherWeeklyPeriods.set(teacherId, (teacherWeeklyPeriods.get(teacherId) || 0) + 1);

                    slotsToCreateThisPass.push({
                      schoolId, classId: unit.classId, armId: unit.armId, subjectId, teacherId, day, periodNumber: periodNum, isLocked: false
                    });

                    swapped = true;
                    break;
                  }
                }
                if (swapped) break;
              }

              if (!swapped) {
                unassignedThisPass.push({
                  className: unit.name,
                  subjectName: req.subject.name,
                  teacherName: `${req.teacher.lastName} ${req.teacher.firstName}`,
                  periodIndex: p + 1
                });
              }
            }
          }

          if (combinedWithArmId) {
            scheduledCombinedKeys.add(combinedKey);
          }
        }
      }

      if (unassignedThisPass.length < bestUnassignedCount) {
        bestSlotsToCreate = slotsToCreateThisPass;
        bestUnassigned = unassignedThisPass;
        bestUnassignedCount = unassignedThisPass.length;

        if (bestUnassignedCount === 0) {
          break;
        }
      }
    }

    const totalPossibleSlots = classArmUnits.length * activeDays.length * periodsPerDay;
    const scheduledSlotsCount = bestSlotsToCreate.length + lockedSlots.length;
    const timetableEfficiency = Math.round((scheduledSlotsCount / totalPossibleSlots) * 100);

    const teacherWeeklyLoads: number[] = [];
    const activeTeacherIds = Array.from(teacherTotalDemand.keys());
    for (const tid of activeTeacherIds) {
      const load = bestSlotsToCreate.filter(s => s.teacherId === tid).length + lockedSlots.filter(s => s.teacherId === tid).length;
      teacherWeeklyLoads.push(load);
    }
    
    let workloadBalance = 100;
    if (teacherWeeklyLoads.length > 0) {
      const avgLoad = teacherWeeklyLoads.reduce((a, b) => a + b, 0) / teacherWeeklyLoads.length;
      const variance = teacherWeeklyLoads.reduce((a, b) => a + Math.pow(b - avgLoad, 2), 0) / teacherWeeklyLoads.length;
      const stdDev = Math.sqrt(variance);
      workloadBalance = Math.max(0, Math.min(100, Math.round(100 - (stdDev * 10))));
    }

    // Wipe previous UNLOCKED slots and save new ones
    await prisma.$transaction(async (tx) => {
      await tx.timetableSlot.deleteMany({
        where: { schoolId, isLocked: false }
      });

      if (bestSlotsToCreate.length > 0) {
        await tx.timetableSlot.createMany({
          data: bestSlotsToCreate
        });
      }
    });

    return NextResponse.json({
      success: true,
      totalSlotsScheduled: scheduledSlotsCount,
      unassignedCount: bestUnassignedCount,
      unassignedRequirements: bestUnassigned,
      isFullyConflictFree: bestUnassignedCount === 0,
      metrics: {
        efficiency: timetableEfficiency,
        balanceScore: workloadBalance,
        clashFreeRatio: bestUnassignedCount === 0 ? 100 : Math.round(((scheduledSlotsCount - bestUnassignedCount) / scheduledSlotsCount) * 100)
      }
    });
  } catch (error: any) {
    console.error('Timetable Generator Engine Error:', error);
    return NextResponse.json({ error: 'Failed to execute automatic scheduling algorithm' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
