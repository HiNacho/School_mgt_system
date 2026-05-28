'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Settings, Users, BookOpen, Plus, Trash2, Sparkles, 
  RefreshCw, AlertTriangle, AlertCircle, CheckCircle, Clock, 
  Check, Save, LayoutGrid, HelpCircle, Lock, Unlock, ArrowRight,
  FileSpreadsheet, Paintbrush, ShieldCheck, Download, ListFilter
} from 'lucide-react';

interface ComputedPeriod {
  label: string;
  start: string;
  end: string;
  isBreak: boolean;
  periodNum?: number;
}

export default function TimetableDashboard() {
  const [activeTab, setActiveTab] = useState<'grid' | 'allocations' | 'teachers' | 'subjects' | 'settings'>('grid');
  const [school, setSchool] = useState<any>(null);
  
  // Data States
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [arms, setArms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Settings States
  const [timetableName, setTimetableName] = useState<string>("2025/2026 First Term Timetable");
  const [timeFormat, setTimeFormat] = useState<string>("12-hour");
  const [schoolDays, setSchoolDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [periodsPerDay, setPeriodsPerDay] = useState<number>(6);
  const [periodDuration, setPeriodDuration] = useState<number>(40);
  const [startTime, setStartTime] = useState<string>("08:00");
  const [breakAfter, setBreakAfter] = useState<number>(3);
  const [breakDuration, setBreakDuration] = useState<number>(30);
  const [specialPeriods, setSpecialPeriods] = useState<any[]>([]);
  const [timetableRules, setTimetableRules] = useState<string[]>([]);
  
  // Allocations States
  const [selectedClassArm, setSelectedClassArm] = useState<string>('');
  const [requirements, setRequirements] = useState<any[]>([]);
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [syncingAllocations, setSyncingAllocations] = useState(false);

  // Bulk CSV Paste State
  const [showBulkLoader, setShowBulkLoader] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState<string>(
    "Class,Arm,Subject Code,Teacher Email,Periods Per Week,Double Period\nJSS 1,A,MTH,fidelis@greenwood.com,5,Yes\nJSS 1,A,ENG,cordelia@greenwood.com,5,Yes"
  );
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkLogs, setBulkLogs] = useState<string[]>([]);

  // Quality Metrics
  const [qualityMetrics, setQualityMetrics] = useState<{
    efficiency: number;
    balanceScore: number;
    clashFreeRatio: number;
  } | null>(null);
  
  // Grid View States
  const [viewMode, setViewMode] = useState<'class' | 'teacher' | 'workload'>('class');
  const [selectedGridClassArm, setSelectedGridClassArm] = useState<string>('');
  const [selectedGridTeacher, setSelectedGridTeacher] = useState<string>('');
  
  // Database Timetable Slots States
  const [slots, setSlots] = useState<any[]>([]);
  
  // UI Flow States
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Manual Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalSlot, setModalSlot] = useState<{ day: string; periodNumber: number } | null>(null);
  const [selectedModalReqId, setSelectedModalReqId] = useState<string>('clear');
  const [modalIsLocked, setModalIsLocked] = useState(false);

  // Drag and drop states
  const [draggedSlot, setDraggedSlot] = useState<any>(null);

  // Curated Visual Color Codes
  const colorMap: { [key: string]: string } = {
    blue: 'bg-blue-550 border-blue-200 text-blue-800',
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    emerald: 'bg-teal-50 text-teal-800 border-teal-200',
    orange: 'bg-orange-50 text-orange-850 border-orange-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-850 border-indigo-200',
    amber: 'bg-amber-50 text-amber-850 border-amber-200',
    teal: 'bg-cyan-50 text-cyan-850 border-cyan-200'
  };

  // Load Session
  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        loadSetupAndTimetable(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Invalid session credentials.');
        setLoading(false);
      }
    } else {
      setErrorMsg('No user session found. Please log in.');
      setLoading(false);
    }
  }, []);

  const loadSetupAndTimetable = async (schoolId: string) => {
    setLoading(true);
    try {
      // 1. Fetch setup data (teachers, classes, arms, subjects)
      const setupRes = await fetch(`/api/setup?schoolId=${schoolId}`);
      const setupJson = await setupRes.json();
      if (setupRes.ok && setupJson.data) {
        setTeachers(setupJson.data.teachers || []);
        setClasses(setupJson.data.classes || []);
        setArms(setupJson.data.arms || []);
        setSubjects(setupJson.data.subjects || []);
        
        // Auto select first class+arm unit for allocations & grid views
        const armUnits = setupJson.data.arms || [];
        if (armUnits.length > 0) {
          const firstUnit = armUnits[0];
          const firstKey = `${firstUnit.classId}_${firstUnit.id}`;
          setSelectedClassArm(firstKey);
          setSelectedGridClassArm(firstKey);
        }
      }

      // 2. Fetch school timetable config
      const configRes = await fetch(`/api/timetable/config?schoolId=${schoolId}`);
      const configJson = await configRes.json();
      if (configRes.ok && configJson.data) {
        const cfg = configJson.data;
        setTimetableName(cfg.timetableName || "2025/2026 First Term Timetable");
        setTimeFormat(cfg.timeFormat || "12-hour");
        setSchoolDays(cfg.schoolDays.split(',').map((d: string) => d.trim()));
        setPeriodsPerDay(cfg.periodsPerDay);
        setPeriodDuration(cfg.periodDuration);
        setStartTime(cfg.startTime);
        setBreakAfter(cfg.breakAfter);
        setBreakDuration(cfg.breakDuration);
        if (cfg.specialPeriods) {
          try {
            setSpecialPeriods(JSON.parse(cfg.specialPeriods));
          } catch(e) {}
        }
        if (cfg.timetableRules) {
          try {
            setTimetableRules(JSON.parse(cfg.timetableRules));
          } catch(e) {}
        }
      }

      // 3. Fetch Teacher availability profiles
      await loadTeacherProfiles(schoolId);

      // 4. Fetch Allocations/Requirements
      await loadRequirements(schoolId);

      // 5. Fetch Active Timetable Slots
      await loadSlots(schoolId);

      // Auto select first teacher for grid view
      if (setupJson.data.teachers && setupJson.data.teachers.length > 0) {
        setSelectedGridTeacher(setupJson.data.teachers[0].id);
      }

    } catch (err) {
      console.error('Failed to load initial configurations:', err);
      setErrorMsg('Failed to sync academic configuration records.');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherProfiles = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/timetable/teachers?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setTeachers(prev => prev.map(t => {
          const prof = json.data.find((p: any) => p.id === t.id);
          return prof ? { ...t, profile: prof.profile } : t;
        }));
      }
    } catch (err) {
      console.error('Error loading teacher profiles:', err);
    }
  };

  const loadRequirements = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/timetable/requirements?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setRequirements(json.data);
      }
    } catch (err) {
      console.error('Error loading subject allocations:', err);
    }
  };

  const loadSlots = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/timetable/slots?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setSlots(json.data);
      }
    } catch (err) {
      console.error('Error loading timetable slots:', err);
    }
  };

  // Dynamic Hour Block Generator
  const getPeriodsList = (): ComputedPeriod[] => {
    const list: ComputedPeriod[] = [];
    let [hours, minutes] = startTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      hours = 8;
      minutes = 0;
    }

    let actualPeriodNum = 1;

    for (let i = 1; i <= periodsPerDay; i++) {
      let startStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      
      // Variable time format display
      if (timeFormat === '12-hour') {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        startStr = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
      }

      minutes += periodDuration;
      while (minutes >= 60) {
        minutes -= 60;
        hours += 1;
      }

      let endStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      if (timeFormat === '12-hour') {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        endStr = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
      }
      
      list.push({
        label: `Period ${actualPeriodNum}`,
        start: startStr,
        end: endStr,
        isBreak: false,
        periodNum: actualPeriodNum
      });
      
      actualPeriodNum++;

      // Inject Break Slot
      if (i === breakAfter) {
        const breakStart = endStr;
        minutes += breakDuration;
        while (minutes >= 60) {
          minutes -= 60;
          hours += 1;
        }
        
        let breakEnd = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        if (timeFormat === '12-hour') {
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          breakEnd = `${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;
        }
        
        list.push({
          label: 'Recess Break',
          start: breakStart,
          end: breakEnd,
          isBreak: true
        });
      }
    }
    return list;
  };

  // Settings Wizard Save
  const handleSaveSettings = async () => {
    if (!school) return;
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          schoolDays: schoolDays.join(','),
          periodsPerDay,
          periodDuration,
          startTime,
          breakAfter,
          breakDuration,
          timetableName,
          timeFormat,
          specialPeriods: JSON.stringify(specialPeriods),
          timetableRules: JSON.stringify(timetableRules)
        })
      });
      
      const json = await res.json();
      if (res.ok) {
        setSuccessMsg('Timetable settings updated successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(json.error || 'Failed to update school configurations.');
      }
    } catch (err) {
      setErrorMsg('Failed to contact database controller.');
    }
  };

  // Subject update color or restrictions
  const handleUpdateSubjectMatrix = async (subjectId: string, color: string, restrictions: string) => {
    if (!school) return;
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          subjectId,
          color,
          restrictions
        })
      });
      const json = await res.json();
      if (res.ok) {
        setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, color, restrictions } : s));
        setSuccessMsg('Subject styling & constraint preferences saved!');
        setTimeout(() => setSuccessMsg(''), 2500);
      } else {
        setErrorMsg(json.error || 'Failed to save subject parameters.');
      }
    } catch (err) {
      setErrorMsg('Failed to sync subject matrix.');
    }
  };

  // Teacher Profile Limit Update
  const handleUpdateTeacherLimit = async (teacherId: string, field: string, val: any) => {
    if (!school) return;
    const tIndex = teachers.findIndex(t => t.id === teacherId);
    if (tIndex === -1) return;
    
    const updatedTeachers = [...teachers];
    const currentProf = updatedTeachers[tIndex].profile || {
      maxPeriodsPerDay: 5,
      maxPeriodsPerWeek: 20,
      consecutiveLimit: 3,
      unavailableDays: '',
      unavailableSlots: ''
    };

    const newProf = {
      ...currentProf,
      [field]: val
    };
    updatedTeachers[tIndex].profile = newProf;
    setTeachers(updatedTeachers);

    try {
      await fetch('/api/timetable/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          userId: teacherId,
          maxPeriodsPerDay: Number(newProf.maxPeriodsPerDay),
          maxPeriodsPerWeek: Number(newProf.maxPeriodsPerWeek),
          consecutiveLimit: Number(newProf.consecutiveLimit),
          unavailableDays: newProf.unavailableDays,
          unavailableSlots: newProf.unavailableSlots
        })
      });
    } catch (err) {
      console.error('Error posting teacher profile limit:', err);
    }
  };

  // Multi-day toggle for teacher off days
  const handleToggleTeacherDay = (teacherId: string, day: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;
    
    const currentDays = teacher.profile?.unavailableDays 
      ? teacher.profile.unavailableDays.split(',').map((d: string) => d.trim()).filter((d: string) => d.length > 0)
      : [];
    
    let nextDays = [];
    if (currentDays.includes(day)) {
      nextDays = currentDays.filter((d: string) => d !== day);
    } else {
      nextDays = [...currentDays, day];
    }
    
    handleUpdateTeacherLimit(teacherId, 'unavailableDays', nextDays.join(','));
  };

  // Toggle fine-grained availability period block
  const handleToggleTeacherSlot = (teacherId: string, day: string, periodNumber: number) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    const currentSlots = teacher.profile?.unavailableSlots
      ? teacher.profile.unavailableSlots.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const slotKey = `${day}_${periodNumber}`;
    let nextSlots = [];
    if (currentSlots.includes(slotKey)) {
      nextSlots = currentSlots.filter((s: string) => s !== slotKey);
    } else {
      nextSlots = [...currentSlots, slotKey];
    }

    handleUpdateTeacherLimit(teacherId, 'unavailableSlots', nextSlots.join(','));
  };

  // Requirements allocation adjustment
  const handleUpdateAllocation = async (subjectId: string, teacherId: string, periods: number, details?: any) => {
    if (!school || !selectedClassArm) return;
    const [classId, armId] = selectedClassArm.split('_');

    setAllocationLoading(true);
    try {
      const res = await fetch('/api/timetable/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          classId,
          armId,
          subjectId,
          teacherId,
          periodsPerWeek: periods,
          ...details
        })
      });
      
      const json = await res.json();
      if (res.ok) {
        await loadRequirements(school.id);
        setSuccessMsg('Subject allocation requirements updated successfully!');
        setTimeout(() => setSuccessMsg(''), 2500);
      } else {
        setErrorMsg(json.error || 'Failed to update subject requirements.');
      }
    } catch (err) {
      setErrorMsg('Failed to sync subject allocation requirements.');
    } finally {
      setAllocationLoading(false);
    }
  };

  // Import allocation assignments via CSV spreadsheet
  const handleBulkCsvImport = async () => {
    if (!school || !bulkCsvText.trim()) return;
    setBulkImportLoading(true);
    setBulkLogs(['Parsing CSV rows...', 'Resolving subjects and teachers against registry...']);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/timetable/requirements/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          csvData: bulkCsvText
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await loadRequirements(school.id);
        setSuccessMsg(`🚀 Successfully imported ${json.importedCount} subject allocation rules!`);
        if (json.validationErrors && json.validationErrors.length > 0) {
          setBulkLogs(json.validationErrors);
        } else {
          setBulkLogs(['All rows successfully validated & saved in database.']);
        }
        setTimeout(() => setSuccessMsg(''), 4500);
      } else {
        setErrorMsg(json.error || 'Bulk spreadsheet upload failed.');
        if (json.validationErrors) {
          setBulkLogs(json.validationErrors);
        }
      }
    } catch (err) {
      setErrorMsg('CSV importer experienced a server gateway failure.');
    } finally {
      setBulkImportLoading(false);
    }
  };

  // Auto-sync subject allocations from registry
  const triggerAllocationsSync = async () => {
    if (!school) return;
    setSuccessMsg('');
    setErrorMsg('');
    setSyncingAllocations(true);

    try {
      const res = await fetch('/api/timetable/requirements/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id })
      });
      
      const json = await res.json();
      if (res.ok && json.success) {
        await loadRequirements(school.id);
        setSuccessMsg(`⚡ Successfully imported ${json.syncedCount} allocations from the central registry!`);
        setTimeout(() => setSuccessMsg(''), 4500);
      } else {
        setErrorMsg(json.error || 'Failed to sync allocations from registry.');
      }
    } catch (err) {
      setErrorMsg('Failed to establish contact with sync API.');
    } finally {
      setSyncingAllocations(false);
    }
  };

  // Run automatic generator
  const triggerAutoGenerator = async () => {
    if (!school) return;
    setSuccessMsg('');
    setErrorMsg('');
    setGenerating(true);
    setGenLogs(["Initializing backtracking constraints...", "Locking pre-configured assemblies and sports...", "Running Greedy random restarts solver..."]);
    
    try {
      const res = await fetch('/api/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id })
      });
      
      const json = await res.json();
      if (res.ok && json.success) {
        await loadSlots(school.id);
        if (json.metrics) {
          setQualityMetrics(json.metrics);
        }
        if (json.isFullyConflictFree) {
          setSuccessMsg(`⚡ Fully conflict-free timetable generated! Scheduled ${json.totalSlotsScheduled} slots successfully.`);
        } else {
          setErrorMsg(`Generated partial timetable initially. Scheduled ${json.totalSlotsScheduled} slots. ${json.unassignedCount} slots unassigned due to tight constraints.`);
        }
      } else {
        setErrorMsg(json.error || 'Failed to generate timetable slots automatically.');
      }
    } catch (err) {
      setErrorMsg('Automatic scheduling engine timed out.');
    } finally {
      setGenerating(false);
    }
  };

  // Drag-and-drop HTML5 Swapper
  const handleDragStart = (e: React.DragEvent, slot: any) => {
    e.dataTransfer.setData('text/plain', slot.id);
    setDraggedSlot(slot);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDay: string, targetPeriodNum: number) => {
    e.preventDefault();
    if (!draggedSlot || !school) return;

    const sourceSlot = draggedSlot;
    setDraggedSlot(null);

    // Save/Move slot in database
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/timetable/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          classId: sourceSlot.classId,
          armId: sourceSlot.armId,
          subjectId: sourceSlot.subjectId,
          teacherId: sourceSlot.teacherId,
          day: targetDay,
          periodNumber: targetPeriodNum,
          isLocked: sourceSlot.isLocked
        })
      });

      const json = await res.json();
      if (res.ok) {
        // Delete original slot if it wasn't the exact same slot
        if (sourceSlot.day !== targetDay || sourceSlot.periodNumber !== targetPeriodNum) {
          await fetch(`/api/timetable/slots?schoolId=${school.id}&id=${sourceSlot.id}`, {
            method: 'DELETE'
          });
        }

        await loadSlots(school.id);
        
        if (json.conflict) {
          setErrorMsg(`⚠ Conflict Alert: ${json.conflict}`);
        } else {
          setSuccessMsg('Lesson dragged and placed successfully.');
          setTimeout(() => setSuccessMsg(''), 2500);
        }
      } else {
        setErrorMsg(json.error || 'Failed to drag lesson.');
      }
    } catch (err) {
      setErrorMsg('Failed to process visual swapper.');
    }
  };

  // Timetable slots reset
  const handleResetTimetable = async () => {
    if (!school) return;
    if (!confirm('Are you sure you want to clear the entire school timetable? This cannot be undone.')) return;
    
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/timetable/slots?schoolId=${school.id}&resetAll=true`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setSlots([]);
        setSuccessMsg('All school timetable grid slots cleared successfully.');
      } else {
        setErrorMsg('Failed to clear timetable database slots.');
      }
    } catch (err) {
      setErrorMsg('Failed to reset timetable slots.');
    }
  };

  // Opening manual cell editor
  const handleOpenCellEditor = (day: string, periodNumber: number) => {
    if (!selectedGridClassArm) return;
    setModalSlot({ day, periodNumber });
    
    // Find active slot if any
    const [classId, armId] = selectedGridClassArm.split('_');
    const existing = slots.find(
      s => s.classId === classId && s.armId === armId && s.day === day && s.periodNumber === periodNumber
    );

    if (existing) {
      const req = requirements.find(
        r => r.classId === classId && r.armId === armId && r.subjectId === existing.subjectId
      );
      setSelectedModalReqId(req?.id || 'clear');
      setModalIsLocked(existing.isLocked || false);
    } else {
      setSelectedModalReqId('clear');
      setModalIsLocked(false);
    }
    
    setShowEditModal(true);
  };

  // Save manual cell editor
  const handleSaveManualCell = async () => {
    if (!school || !selectedGridClassArm || !modalSlot) return;
    const [classId, armId] = selectedGridClassArm.split('_');
    
    setSuccessMsg('');
    setErrorMsg('');
    setShowEditModal(false);

    try {
      if (selectedModalReqId === 'clear') {
        const existing = slots.find(
          s => s.classId === classId && s.armId === armId && s.day === modalSlot.day && s.periodNumber === modalSlot.periodNumber
        );
        if (existing) {
          const res = await fetch(`/api/timetable/slots?schoolId=${school.id}&id=${existing.id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setSlots(prev => prev.filter(s => s.id !== existing.id));
            setSuccessMsg('Cell cleared successfully.');
            setTimeout(() => setSuccessMsg(''), 2500);
          }
        }
      } else {
        const req = requirements.find(r => r.id === selectedModalReqId);
        if (!req) return;

        const res = await fetch('/api/timetable/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: school.id,
            classId,
            armId,
            subjectId: req.subjectId,
            teacherId: req.teacherId,
            day: modalSlot.day,
            periodNumber: modalSlot.periodNumber,
            isLocked: modalIsLocked
          })
        });

        const json = await res.json();
        if (res.ok && json.success) {
          await loadSlots(school.id);
          if (json.conflict) {
            setErrorMsg(`⚠ Warning: ${json.conflict}`);
          } else {
            setSuccessMsg('Manual cell placement saved successfully.');
            setTimeout(() => setSuccessMsg(''), 2500);
          }
        } else {
          setErrorMsg(json.error || 'Failed to place manual cell allocation.');
        }
      }
    } catch (err) {
      setErrorMsg('Failed to save manual timetable slot.');
    }
  };

  // Client-Side Clash Check Helper for interactive visual grid
  const getTeacherClashWarning = (slot: any): string | null => {
    if (!slot) return null;
    const clashing = slots.find(
      s => s.schoolId === slot.schoolId && 
           s.teacherId === slot.teacherId && 
           s.day === slot.day && 
           s.periodNumber === slot.periodNumber &&
           s.id !== slot.id
    );

    if (clashing) {
      return `Clash: Mr/Mrs ${clashing.teacher.lastName} is already assigned to ${clashing.class.name} ${clashing.arm.name}!`;
    }
    return null;
  };

  // Compute stats for Workloads tab
  const getTeacherWeeklyLoad = (teacherId: string): number => {
    return slots.filter(s => s.teacherId === teacherId).length;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600 mb-4"></div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Accessing school timetable console telemetry...</p>
      </div>
    );
  }

  const getGridArmDetails = () => {
    if (!selectedGridClassArm) return null;
    const [classId, armId] = selectedGridClassArm.split('_');
    const cl = classes.find(c => c.id === classId);
    const ar = arms.find(a => a.id === armId);
    return cl && ar ? `${cl.name} - ${ar.name}` : '';
  };

  const getModalRequirementsOptions = () => {
    if (!selectedGridClassArm) return [];
    const [classId, armId] = selectedGridClassArm.split('_');
    return requirements.filter(r => r.classId === classId && r.armId === armId);
  };

  // Check if active day + period is mapped to a Special Period configured in settings
  const getSpecialPeriodInSlot = (day: string, periodNumber: number) => {
    return specialPeriods.find(s => s.day === day && Number(s.periodNumber) === periodNumber);
  };

  const isGreenwood = school?.slug === 'greenwood-secondary';
  const themeAccentBg = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/10';
  const themeText = isGreenwood ? 'text-emerald-600' : 'text-blue-600';
  const themeBadge = isGreenwood ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`p-2.5 bg-emerald-600/10 ${themeText} rounded-2xl`}>
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${themeBadge}`}>{timetableName}</span>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Timetable Automation Console</h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium pl-11">
            Configure variable class blocks, block fine-grained teacher off-hours, lock sports & assemblies, and run the backtracking solver.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerAutoGenerator}
            disabled={generating}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black text-white shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${themeAccentBg}`}
          >
            <Sparkles className="h-4 w-4" />
            {generating ? 'Solver Running...' : '⚡ Generate Timetable'}
          </button>

          <button
            onClick={handleResetTimetable}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Wipe Grid
          </button>
        </div>
      </div>

      {/* Quality Metrics Summary */}
      {qualityMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-semibold no-print">
          <div className="p-4 rounded-2xl bg-white border border-slate-150 shadow-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Timetable Efficiency</span>
              <span className="text-lg font-black text-slate-800">{qualityMetrics.efficiency}% Scheduled</span>
            </div>
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-150 shadow-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Workload Balance rating</span>
              <span className="text-lg font-black text-slate-800">{qualityMetrics.balanceScore}/100 Balanced</span>
            </div>
            <Sparkles className="h-7 w-7 text-indigo-600" />
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-150 shadow-xs flex items-center justify-between">
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Conflict-Free Status</span>
              <span className="text-lg font-black text-slate-800">{qualityMetrics.clashFreeRatio}% Clean</span>
            </div>
            <Check className="h-7 w-7 text-emerald-500 animate-pulse" />
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-800 text-xs font-medium animate-slideUp no-print">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800 text-xs font-medium animate-slideUp no-print">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Generating Overlay Progress Logger */}
      {generating && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative">
                <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-emerald-650"></div>
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-emerald-600 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">AI Constraint Backtracking Solver</h3>
              <p className="text-xs font-semibold text-slate-400">Pre-allocating combined classes and variable double periods...</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11px] font-mono text-slate-500 space-y-2 h-36 overflow-y-auto max-h-36">
              {genLogs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-1.5 animate-fadeIn">
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs Menu Navigation */}
      <div className="flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-2xl max-w-2xl no-print">
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          Timetable Matrix
        </button>

        <button
          onClick={() => setActiveTab('allocations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'allocations' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Subject Allocation
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'teachers' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Users className="h-4 w-4" />
          Teacher Matrix
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'subjects' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Paintbrush className="h-4 w-4" />
          Subject Matrix
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-850'
          }`}
        >
          <Settings className="h-4 w-4" />
          School Setup
        </button>
      </div>

      {/* --- CONTENT TABS --- */}

      {/* 1. GRID MATRIX VIEW TAB */}
      {activeTab === 'grid' && (
        <div className="space-y-6">
          {/* Sub menu controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm no-print">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-start">
              <button
                onClick={() => setViewMode('class')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${viewMode === 'class' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Class View
              </button>
              <button
                onClick={() => setViewMode('teacher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${viewMode === 'teacher' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Teacher View
              </button>
              <button
                onClick={() => setViewMode('workload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${viewMode === 'workload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Workload Audit
              </button>
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'class' && arms.length > 0 && (
                <>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Class & Arm:</span>
                  <select
                    value={selectedGridClassArm}
                    onChange={(e) => setSelectedGridClassArm(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {arms.map(arm => (
                      <option key={`${arm.classId}_${arm.id}`} value={`${arm.classId}_${arm.id}`}>
                        {arm.class.name} - {arm.name}
                      </option>
                    ))}
                  </select>
                  <a
                    href={`/api/timetable/export?schoolId=${school.id}&type=class&id=${selectedGridClassArm}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-150 rounded-xl"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV Export
                  </a>
                </>
              )}

              {viewMode === 'teacher' && teachers.length > 0 && (
                <>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Instructor:</span>
                  <select
                    value={selectedGridTeacher}
                    onChange={(e) => setSelectedGridTeacher(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.lastName} {t.firstName}
                      </option>
                    ))}
                  </select>
                  <a
                    href={`/api/timetable/export?schoolId=${school.id}&type=teacher&id=${selectedGridTeacher}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-150 rounded-xl"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV Export
                  </a>
                </>
              )}
            </div>
          </div>

          {/* MAIN CLASS GRID CARD */}
          {viewMode === 'class' && (
            <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Timetable Calendar: {getGridArmDetails()}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Weekly Period Grid (Mon–Fri)</p>
                </div>
                <div className="flex items-center gap-3 no-print">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Valid Slot
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Conflict Clash
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-50 ${themeText} hover:bg-emerald-100 transition-all cursor-pointer border border-emerald-100 pl-2.5`}
                  >
                    <span>Print Timetable</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="p-4 text-left font-black text-slate-500 w-32">Time Block</th>
                      {schoolDays.map(day => (
                        <th key={day} className="p-4 text-center border-l border-slate-100 w-44">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getPeriodsList().map((period, pIdx) => {
                      if (period.isBreak) {
                        return (
                          <tr key={`break-${pIdx}`} className="bg-slate-50/70 border-b border-slate-150 text-center font-bold text-slate-400">
                            <td className="p-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-4">
                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Recess</span>
                            </td>
                            {schoolDays.map(day => (
                              <td key={`break-${day}-${pIdx}`} className="p-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-l border-slate-100 bg-slate-100/20">
                                {period.start} - {period.end} ({breakDuration} mins)
                              </td>
                            ))}
                          </tr>
                        );
                      }

                      const periodNum = period.periodNum!;

                      return (
                        <tr key={`p-${periodNum}`} className="border-b border-slate-100 group">
                          <td className="p-4 font-semibold text-slate-800 text-xs tracking-tight">
                            <div className="font-black text-slate-700">{period.label}</div>
                            <div className="text-[10px] font-semibold text-slate-400">{period.start} - {period.end}</div>
                          </td>

                          {schoolDays.map(day => {
                            const [classId, armId] = selectedGridClassArm.split('_');
                            
                            // Check if a Special School Period locks this block
                            const specialSlot = getSpecialPeriodInSlot(day, periodNum);
                            
                            const cellSlot = slots.find(
                              s => s.classId === classId && 
                                   s.armId === armId && 
                                   s.day === day && 
                                   s.periodNumber === periodNum
                            );

                            const clashWarning = getTeacherClashWarning(cellSlot);
                            
                            // Check if this subject has a specific color mapping
                            let bgClass = 'bg-blue-50/5';
                            if (cellSlot && cellSlot.subject?.color) {
                              bgClass = colorMap[cellSlot.subject.color] || bgClass;
                            }

                            return (
                              <td
                                key={`${day}-${periodNum}`}
                                onClick={() => !specialSlot && handleOpenCellEditor(day, periodNum)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => !specialSlot && handleDrop(e, day, periodNum)}
                                className={`p-3 border-l border-slate-100 transition-all text-center cursor-pointer relative hover:bg-slate-50/60 ${
                                  specialSlot ? 'bg-amber-50/20 cursor-not-allowed select-none' : clashWarning ? 'bg-rose-50/30' : cellSlot ? bgClass : ''
                                }`}
                              >
                                {specialSlot ? (
                                  <div className="space-y-1 animate-fadeIn select-none py-1.5">
                                    <div className="font-black text-xs text-amber-850 tracking-tight flex items-center justify-center gap-1">
                                      <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                                      <span>{specialSlot.label.toUpperCase()}</span>
                                    </div>
                                    <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                      School Locked
                                    </div>
                                  </div>
                                ) : cellSlot ? (
                                  <div 
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, cellSlot)}
                                    className="space-y-1 animate-fadeIn cursor-grab active:cursor-grabbing p-1.5 rounded-xl border border-transparent hover:border-slate-300 transition-all"
                                  >
                                    <div className="font-black text-xs text-blue-900 tracking-tight flex items-center justify-center gap-1">
                                      {cellSlot.isLocked && <Lock className="h-3 w-3 text-blue-600 shrink-0" />}
                                      <span>{cellSlot.subject.name}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400">
                                      {cellSlot.teacher.lastName} {cellSlot.teacher.firstName[0]}.
                                    </div>
                                    
                                    {clashWarning && (
                                      <div 
                                        title={clashWarning}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 animate-pulse mt-1"
                                      >
                                        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                        Clash
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-all py-2">
                                    + Assign Slot
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEACHER PERSONAL CALENDAR */}
          {viewMode === 'teacher' && (
            <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">Instructor Diary</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Weekly Schedule Grid (Mon–Fri)</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-50 ${themeText} hover:bg-emerald-100 transition-all cursor-pointer border border-emerald-100 pl-2.5 no-print`}
                >
                  <span>Print Timetable</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="p-4 text-left font-black text-slate-500 w-32">Time Block</th>
                      {schoolDays.map(day => (
                        <th key={day} className="p-4 text-center border-l border-slate-100 w-44">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getPeriodsList().map((period, pIdx) => {
                      if (period.isBreak) {
                        return (
                          <tr key={`break-${pIdx}`} className="bg-slate-50/70 border-b border-slate-150 text-center font-bold text-slate-400">
                            <td className="p-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 pl-4">
                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>Recess</span>
                            </td>
                            {schoolDays.map(day => (
                              <td key={`break-${day}-${pIdx}`} className="p-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest border-l border-slate-100/50 bg-slate-100/20">
                                {period.start} - {period.end} ({breakDuration} mins)
                              </td>
                            ))}
                          </tr>
                        );
                      }

                      const periodNum = period.periodNum!;

                      return (
                        <tr key={`p-${periodNum}`} className="border-b border-slate-100 group">
                          <td className="p-4 font-semibold text-slate-800 text-xs tracking-tight">
                            <div className="font-black text-slate-700">{period.label}</div>
                            <div className="text-[10px] font-semibold text-slate-400">{period.start} - {period.end}</div>
                          </td>

                          {schoolDays.map(day => {
                            const cellSlot = slots.find(
                              s => s.teacherId === selectedGridTeacher && 
                                   s.day === day && 
                                   s.periodNumber === periodNum
                            );

                            return (
                              <td
                                key={`${day}-${periodNum}`}
                                className={`p-4 border-l border-slate-100 text-center relative ${
                                  cellSlot ? 'bg-indigo-50/10' : ''
                                }`}
                              >
                                {cellSlot ? (
                                  <div className="space-y-1 animate-fadeIn">
                                    <div className="font-black text-xs text-indigo-700 tracking-tight flex items-center justify-center gap-1">
                                      {cellSlot.isLocked && <Lock className="h-3 w-3 text-indigo-600 shrink-0" />}
                                      <span>{cellSlot.class.name} - {cellSlot.arm.name}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400">
                                      {cellSlot.subject.name}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-200">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TEACHER WORKLOAD SUMMARY VIEW */}
          {viewMode === 'workload' && (
            <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Workload Limits Capacity Registry</h3>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachers.map(teacher => {
                    const currentLoad = getTeacherWeeklyLoad(teacher.id);
                    const cap = teacher.profile?.maxPeriodsPerWeek || 20;
                    const percent = Math.min(Math.round((currentLoad / cap) * 100), 100);
                    
                    return (
                      <div key={teacher.id} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all flex flex-col justify-between space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-xs text-slate-700">{teacher.lastName} {teacher.firstName}</h4>
                            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">{teacher.role.replace('_', ' ')}</span>
                          </div>
                          
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            percent > 90 ? 'bg-rose-50 text-rose-600' : percent > 70 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {currentLoad} / {cap} Periods
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400">
                            <span>Weekly Load Index</span>
                            <span>{percent}% Capacity</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                percent > 90 ? 'bg-rose-500' : percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SUBJECT ALLOCATIONS TAB */}
      {activeTab === 'allocations' && (
        <div className="space-y-6">
          {/* CSV Bulk importer toggler */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden p-5 flex items-center justify-between no-print">
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                Spreadsheet CSV Lesson Assignments Importer
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Paste spreadsheet rows directly to register weekly subject quotas and double periods.
              </p>
            </div>
            <button
              onClick={() => setShowBulkLoader(!showBulkLoader)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold"
            >
              {showBulkLoader ? 'Hide Panel' : 'Paste CSV Rows'}
            </button>
          </div>

          {showBulkLoader && (
            <div className="bg-white rounded-3xl border border-slate-150 shadow-sm p-6 space-y-4 animate-fadeIn no-print">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-450 pl-1">
                CSV Input Data (Header: Class, Arm, Subject Code, Teacher Email, Periods Per Week, Double Period)
              </label>
              <textarea
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                rows={5}
                className="w-full bg-slate-50 border border-slate-150 rounded-2xl p-4 text-xs font-mono focus:outline-none focus:border-blue-500 text-slate-700"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={handleBulkCsvImport}
                  disabled={bulkImportLoading}
                  className={`px-5 py-3 rounded-2xl text-xs font-black text-white ${themeAccentBg}`}
                >
                  {bulkImportLoading ? 'Importing CSV...' : '🚀 Submit CSV Rows'}
                </button>
                {bulkLogs.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-bold">Import Status Logged Below</span>
                )}
              </div>
              {bulkLogs.length > 0 && (
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-1.5 text-[11px] font-mono max-h-36 overflow-y-auto">
                  {bulkLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-emerald-500">✓</span>
                      <span className="text-slate-500">{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Class Subject Allocations Board</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Configure double periods, preferred days off, and merged joint streams.</p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto no-print">
                <button
                  type="button"
                  onClick={triggerAllocationsSync}
                  disabled={syncingAllocations}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black bg-emerald-50 ${themeText} hover:bg-emerald-100 transition-all cursor-pointer disabled:opacity-50`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncingAllocations ? 'animate-spin' : ''}`} />
                  {syncingAllocations ? 'Syncing...' : 'Auto-Sync Registry'}
                </button>

                {arms.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Class & Arm:</span>
                    <select
                      value={selectedClassArm}
                      onChange={(e) => setSelectedClassArm(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold text-slate-650 bg-white border border-slate-150 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {arms.map(arm => (
                        <option key={`${arm.classId}_${arm.id}`} value={`${arm.classId}_${arm.id}`}>
                          {arm.class.name} - {arm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* ALLOCATIONS LIST MATRIX */}
            <div className="p-6">
              {selectedClassArm ? (
                <div className="space-y-4">
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                          <th className="p-4 text-left font-black text-slate-500 w-48">Subject Details</th>
                          <th className="p-4 text-left font-black text-slate-500">Assigned Teacher</th>
                          <th className="p-4 text-center font-black text-slate-500 w-24">Weekly Quota</th>
                          <th className="p-4 text-center font-black text-slate-500 w-32">Double Slot</th>
                          <th className="p-4 text-center font-black text-slate-500 w-44">Merged Arm (Joint Lesson)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map(subject => {
                          const [classId, armId] = selectedClassArm.split('_');
                          const req = requirements.find(
                            r => r.classId === classId && r.armId === armId && r.subjectId === subject.id
                          );

                          return (
                            <tr key={subject.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs font-semibold">
                              <td className="p-4">
                                <div className="font-black text-xs text-slate-700">{subject.name}</div>
                                <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase bg-slate-100 px-1.5 py-0.5 rounded-full">{subject.code}</span>
                              </td>

                              <td className="p-4">
                                <select
                                  value={req?.teacherId || ''}
                                  onChange={(e) => handleUpdateAllocation(subject.id, e.target.value, req?.periodsPerWeek || 5, {
                                    doublePeriod: req?.doublePeriod || false,
                                    combinedWithArmId: req?.combinedWithArmId || ''
                                  })}
                                  disabled={allocationLoading}
                                  className="px-3 py-2 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 w-56 disabled:opacity-50"
                                >
                                  <option value="">-- Unassigned --</option>
                                  {teachers.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.lastName} {t.firstName}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td className="p-4 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="15"
                                  value={req?.periodsPerWeek ?? 0}
                                  onChange={(e) => handleUpdateAllocation(subject.id, req?.teacherId || '', Number(e.target.value), {
                                    doublePeriod: req?.doublePeriod || false,
                                    combinedWithArmId: req?.combinedWithArmId || ''
                                  })}
                                  disabled={allocationLoading || !req?.teacherId}
                                  className="w-16 text-center px-3 py-1.5 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none disabled:opacity-50"
                                />
                              </td>

                              <td className="p-4 text-center">
                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={req?.doublePeriod || false}
                                    onChange={(e) => handleUpdateAllocation(subject.id, req?.teacherId || '', req?.periodsPerWeek || 5, {
                                      doublePeriod: e.target.checked,
                                      combinedWithArmId: req?.combinedWithArmId || ''
                                    })}
                                    disabled={allocationLoading || !req?.teacherId}
                                    className="h-4 w-4 text-emerald-600 border-slate-200 rounded focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                                  />
                                  <span className="text-[10px] font-bold text-slate-400">Consecutive</span>
                                </label>
                              </td>

                              <td className="p-4 text-center">
                                <select
                                  value={req?.combinedWithArmId || ''}
                                  onChange={(e) => handleUpdateAllocation(subject.id, req?.teacherId || '', req?.periodsPerWeek || 5, {
                                    doublePeriod: req?.doublePeriod || false,
                                    combinedWithArmId: e.target.value
                                  })}
                                  disabled={allocationLoading || !req?.teacherId}
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 disabled:opacity-50"
                                >
                                  <option value="">-- Single Arm --</option>
                                  {arms.filter(a => a.classId === classId && a.id !== armId).map(a => (
                                    <option key={a.id} value={a.id}>
                                      Merge with Arm {a.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs font-bold text-slate-350">
                  Please configure classes and subjects to define period limits.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TEACHER WORKLOAD LIMITS & AVAILABILITY MATRIX */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Teacher Availability Profiles & Fine-Grained Matrices</h3>
          </div>

          <div className="p-6 space-y-6">
            {teachers.map(teacher => {
              const prof = teacher.profile || {
                maxPeriodsPerDay: 5,
                maxPeriodsPerWeek: 20,
                consecutiveLimit: 3,
                unavailableDays: '',
                unavailableSlots: ''
              };

              const offDays = prof.unavailableDays 
                ? prof.unavailableDays.split(',').map((d: string) => d.trim()) 
                : [];

              const blockedSlots = prof.unavailableSlots
                ? prof.unavailableSlots.split(',').map((s: string) => s.trim())
                : [];

              return (
                <div key={teacher.id} className="p-5 rounded-2xl border border-slate-150 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-50">
                    <div>
                      <h4 className="font-black text-xs text-slate-700">{teacher.lastName} {teacher.firstName}</h4>
                      <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {teacher.role.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Max/Day</label>
                        <select
                          value={prof.maxPeriodsPerDay}
                          onChange={(e) => handleUpdateTeacherLimit(teacher.id, 'maxPeriodsPerDay', Number(e.target.value))}
                          className="px-2.5 py-1 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-150 rounded-xl"
                        >
                          {[1,2,3,4,5,6,7,8].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Max/Week</label>
                        <select
                          value={prof.maxPeriodsPerWeek}
                          onChange={(e) => handleUpdateTeacherLimit(teacher.id, 'maxPeriodsPerWeek', Number(e.target.value))}
                          className="px-2.5 py-1 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-150 rounded-xl"
                        >
                          {[5,10,15,20,25,30,35,40].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Consecutive</label>
                        <select
                          value={prof.consecutiveLimit}
                          onChange={(e) => handleUpdateTeacherLimit(teacher.id, 'consecutiveLimit', Number(e.target.value))}
                          className="px-2.5 py-1 text-xs font-bold text-slate-650 bg-slate-50 border border-slate-150 rounded-xl"
                        >
                          {[1,2,3,4,5,6].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Fine-grained availability week matrix */}
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                      Interactive Period Availability Matrix (Click cells to Block / Unavailable)
                    </label>

                    <div className="grid grid-cols-6 gap-2">
                      <div className="text-center font-bold text-slate-400 text-[10px] py-1 border-r border-slate-100">Time Block</div>
                      {schoolDays.map(day => (
                        <div key={day} className="text-center font-black text-slate-400 text-[9px] uppercase tracking-wider py-1">
                          {day.substring(0, 3)}
                        </div>
                      ))}
                    </div>

                    {/* Period Rows */}
                    {Array.from({ length: periodsPerDay }, (_, pIdx) => pIdx + 1).map(pNum => (
                      <div key={pNum} className="grid grid-cols-6 gap-2 items-center">
                        <div className="text-left font-bold text-slate-600 text-[10px] pl-1.5">
                          Period {pNum}
                        </div>
                        {schoolDays.map(day => {
                          const slotKey = `${day}_${pNum}`;
                          const isBlocked = blockedSlots.includes(slotKey);
                          return (
                            <button
                              key={day}
                              onClick={() => handleToggleTeacherSlot(teacher.id, day, pNum)}
                              className={`py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all cursor-pointer ${
                                isBlocked 
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                                  : 'bg-emerald-50/20 text-emerald-800 border-emerald-100 hover:bg-emerald-50'
                              }`}
                            >
                              {isBlocked ? 'Blocked' : 'Available'}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SUBJECT COLORS & RESTRICTIONS TAB */}
      {activeTab === 'subjects' && (
        <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Subject Color Coding & Restrictions Matrix</h3>
          </div>

          <div className="p-6 space-y-6">
            {subjects.map(sub => {
              let rules: any = {};
              if (sub.restrictions) {
                try {
                  rules = JSON.parse(sub.restrictions);
                } catch(e) {}
              }

              const blocked = rules.blockedPeriods || [];
              const preferred = rules.preferredPeriods || [];

              const handleToggleBlockPeriod = (pNum: number) => {
                let nextBlocked = [...blocked];
                if (nextBlocked.includes(pNum)) {
                  nextBlocked = nextBlocked.filter(n => n !== pNum);
                } else {
                  nextBlocked = [...nextBlocked, pNum];
                  // preferred cannot contain a blocked period
                  rules.preferredPeriods = (rules.preferredPeriods || []).filter((n: number) => n !== pNum);
                }
                rules.blockedPeriods = nextBlocked;
                handleUpdateSubjectMatrix(sub.id, sub.color || 'blue', JSON.stringify(rules));
              };

              const handleTogglePreferPeriod = (pNum: number) => {
                let nextPreferred = [...preferred];
                if (nextPreferred.includes(pNum)) {
                  nextPreferred = nextPreferred.filter(n => n !== pNum);
                } else {
                  nextPreferred = [...nextPreferred, pNum];
                  rules.blockedPeriods = (rules.blockedPeriods || []).filter((n: number) => n !== pNum);
                }
                rules.preferredPeriods = nextPreferred;
                handleUpdateSubjectMatrix(sub.id, sub.color || 'blue', JSON.stringify(rules));
              };

              return (
                <div key={sub.id} className="p-5 rounded-2xl border border-slate-150 flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs font-semibold">
                  <div className="space-y-1">
                    <h4 className="font-black text-xs text-slate-700">{sub.name}</h4>
                    <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                      {sub.code}
                    </span>

                    {/* Color picker pills */}
                    <div className="flex items-center gap-1.5 pt-2">
                      {Object.keys(colorMap).map(cKey => (
                        <button
                          key={cKey}
                          onClick={() => handleUpdateSubjectMatrix(sub.id, cKey, sub.restrictions || '')}
                          className={`w-4 h-4 rounded-full border border-slate-300 hover:scale-110 active:scale-95 transition-all ${
                            cKey === 'blue' ? 'bg-blue-400' : cKey === 'green' ? 'bg-emerald-400' : cKey === 'emerald' ? 'bg-teal-400' : cKey === 'orange' ? 'bg-orange-400' : cKey === 'purple' ? 'bg-purple-400' : cKey === 'rose' ? 'bg-rose-400' : cKey === 'indigo' ? 'bg-indigo-400' : cKey === 'amber' ? 'bg-amber-400' : 'bg-cyan-400'
                          } ${sub.color === cKey ? 'ring-2 ring-slate-800' : ''}`}
                          title={`Display color: ${cKey}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Periods matrix preferences */}
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest pl-0.5">
                      Daily Time Slot Preference Matrix
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: periodsPerDay }, (_, pIdx) => pIdx + 1).map(pNum => {
                        const isBlocked = blocked.includes(pNum);
                        const isPreferred = preferred.includes(pNum);

                        return (
                          <div key={pNum} className="flex items-center gap-1 bg-slate-50 border border-slate-150 p-2 rounded-xl">
                            <span className="font-bold text-slate-650 text-[10px]">Period {pNum}</span>
                            <button
                              onClick={() => handleTogglePreferPeriod(pNum)}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                                isPreferred ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              Prefer
                            </button>
                            <button
                              onClick={() => handleToggleBlockPeriod(pNum)}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition-all ${
                                isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              Block
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SCHOOL CONFIGURATION TAB */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden p-6 space-y-6">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Timetable General Parameters</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Timetable Label Name</label>
                <input
                  type="text"
                  value={timetableName}
                  onChange={(e) => setTimetableName(e.target.value)}
                  className="w-full px-3 py-3 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Display Time Format</label>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="w-full px-3 py-3 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none"
                >
                  <option value="12-hour">12-hour (AM/PM format)</option>
                  <option value="24-hour">24-hour (Military format)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Starting Hour</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-650 focus:outline-none w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Standard Duration (Mins)</label>
                <select
                  value={periodDuration}
                  onChange={(e) => setPeriodDuration(Number(e.target.value))}
                  className="w-full px-3 py-3.5 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={35}>35 Minutes</option>
                  <option value={40}>40 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={50}>50 Minutes</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Periods Count / Day</label>
                <select
                  value={periodsPerDay}
                  onChange={(e) => setPeriodsPerDay(Number(e.target.value))}
                  className="w-full px-3 py-3.5 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none"
                >
                  {[4, 5, 6, 7, 8, 9, 10].map(n => (
                    <option key={n} value={n}>{n} Periods</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Recess Break Duration (Mins)</label>
                <select
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full px-3 py-3.5 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={20}>20 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={40}>40 Minutes</option>
                  <option value={45}>45 Minutes</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Break Time Placement</label>
                <select
                  value={breakAfter}
                  onChange={(e) => setBreakAfter(Number(e.target.value))}
                  className="w-full px-3 py-3.5 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none"
                >
                  {[2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>Break after Period {n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Special Period Rules (STEP 1. D) */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Locked Special School Events (Assembly, Sports)</h4>
                <button
                  type="button"
                  onClick={() => setSpecialPeriods([...specialPeriods, { day: 'Monday', periodNumber: 1, label: 'Assembly', applyTo: 'all' }])}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-650 hover:bg-slate-50 text-[10px] font-bold"
                >
                  + Add Event
                </button>
              </div>

              <div className="space-y-2.5">
                {specialPeriods.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-2xl text-xs font-semibold">
                    <input
                      type="text"
                      value={spec.label}
                      onChange={(e) => {
                        const next = [...specialPeriods];
                        next[idx].label = e.target.value;
                        setSpecialPeriods(next);
                      }}
                      className="bg-white border border-slate-100 rounded-xl px-2.5 py-1 w-28 text-xs focus:outline-none font-bold"
                    />

                    <select
                      value={spec.day}
                      onChange={(e) => {
                        const next = [...specialPeriods];
                        next[idx].day = e.target.value;
                        setSpecialPeriods(next);
                      }}
                      className="bg-white border border-slate-100 rounded-xl px-2 py-1 text-xs focus:outline-none"
                    >
                      {schoolDays.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      value={spec.periodNumber}
                      onChange={(e) => {
                        const next = [...specialPeriods];
                        next[idx].periodNumber = Number(e.target.value);
                        setSpecialPeriods(next);
                      }}
                      className="bg-white border border-slate-100 rounded-xl px-2 py-1 text-xs focus:outline-none"
                    >
                      {Array.from({ length: periodsPerDay }, (_, pIdx) => pIdx + 1).map(n => (
                        <option key={n} value={n}>Period {n}</option>
                      ))}
                    </select>

                    <select
                      value={spec.applyTo}
                      onChange={(e) => {
                        const next = [...specialPeriods];
                        next[idx].applyTo = e.target.value;
                        setSpecialPeriods(next);
                      }}
                      className="bg-white border border-slate-100 rounded-xl px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value="all">All Arm Streams</option>
                      {arms.map(a => (
                        <option key={a.id} value={`${a.classId}_${a.id}`}>
                          {a.class.name} {a.name} Only
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setSpecialPeriods(specialPeriods.filter((_, sIdx) => sIdx !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-black text-white shadow-md cursor-pointer ${themeAccentBg}`}
            >
              <Save className="h-4 w-4" />
              Save Configurations
            </button>
          </div>

          {/* Variable period times preview card */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden p-6 space-y-6">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Active Variable Grid Matrix Preview</h3>
            
            <div className="space-y-3">
              {getPeriodsList().map((period, idx) => (
                <div 
                  key={idx} 
                  className={`flex justify-between items-center p-3 rounded-2xl border text-xs font-semibold ${
                    period.isBreak 
                      ? 'bg-amber-50 border-amber-100/50 text-amber-700' 
                      : 'bg-slate-50 border-slate-100 text-slate-600'
                  }`}
                >
                  <span className="font-black">{period.label}</span>
                  <span className="font-mono bg-white/80 px-2.5 py-1 rounded-xl shadow-xs border border-slate-100/50 text-[10px]">
                    {period.start} - {period.end}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- MANUAL CELL ASSIGNMENT MODAL EDITOR OVERLAY --- */}
      {showEditModal && modalSlot && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">
                Placement: {modalSlot.day} Period {modalSlot.periodNumber}
              </h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-655 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Choose Allocation</label>
                <select
                  value={selectedModalReqId}
                  onChange={(e) => setSelectedModalReqId(e.target.value)}
                  className="w-full px-3 py-3 text-xs font-semibold text-slate-650 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="clear">-- Clear Slot (Empty Period) --</option>
                  {getModalRequirementsOptions().map(r => (
                    <option key={r.id} value={r.id}>
                      {r.subject.name} - {r.teacher.lastName} {r.teacher.firstName[0]}. ({r.periodsPerWeek} per week)
                    </option>
                  ))}
                </select>
              </div>

              {selectedModalReqId !== 'clear' && (
                <div 
                  className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:border-slate-200/60 transition-all cursor-pointer select-none" 
                  onClick={() => setModalIsLocked(!modalIsLocked)}
                >
                  <input
                    type="checkbox"
                    checked={modalIsLocked}
                    onChange={(e) => setModalIsLocked(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 border-slate-200 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1 text-xs font-black text-slate-705">
                    <Lock className="h-3.5 w-3.5 text-emerald-650 shrink-0" />
                    <span>Lock / Freeze Period</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 font-semibold">
              <button
                onClick={handleSaveManualCell}
                className="w-full py-3 rounded-2xl text-xs font-black bg-slate-800 text-white shadow-md hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
              >
                Save Placement
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-slate-50 text-slate-500 hover:bg-slate-100 cursor-pointer text-center border border-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Printing Style Overlay Injection */}
      <style>{`
        @media print {
          aside, nav, .no-print, button, select, input, footer, header {
            display: none !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          @page {
            size: landscape;
            margin: 0.5cm;
          }

          body {
            background-color: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .shadow-sm, table {
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px !important;
          }

          .bg-slate-50\\/50, .bg-slate-50\\/30 {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

    </div>
  );
}
