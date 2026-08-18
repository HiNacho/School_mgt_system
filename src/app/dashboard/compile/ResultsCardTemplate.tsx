'use client';

import React from 'react';

export interface StudentReport {
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    gender: 'MALE' | 'FEMALE';
    passportPhoto?: string | null;
    className: string;
    armName: string;
    fatherName?: string;
    motherName?: string;
    dob?: string;
    dateOfAdmission?: string;
  };
  classTeacherName?: string;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    ca1?: number | null;
    ca2?: number | null;
    assignment?: number | null;
    exam?: number | null;
    total: number;
    grade: string;
    remarks: string;
    subjectRank?: number;
    rankFormatted?: string;
  }>;
  summary: {
    aggregateScore: number;
    averageScore: number;
    classPosition: number;
    classPositionFormatted: string;
    totalStudents: number;
    passStatus: 'PASS' | 'FAIL';
  };
  attendance: {
    present: number;
    absent: number;
    total: number;
  };
  comments: {
    teacher: string;
    headTeacher: string;
    isAIGenerated?: boolean;
  };
  traits: Record<string, number>;
}

interface ResultsCardTemplateProps {
  report: StudentReport;
  compiledSchool: any;
  compiledTerm: any;
  showPosition?: boolean;
}

export default function ResultsCardTemplate({ report, compiledSchool, compiledTerm, showPosition = true }: ResultsCardTemplateProps) {
  // Calculations
  const totalMaxMarks = (report.subjects?.length || 0) * 100;
  const totalMarksObtained = report.summary?.aggregateScore || report.subjects?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
  const overallPercentage = report.summary?.averageScore || 0;

  // Grade calculation
  let overallGrade = 'A';
  if (overallPercentage >= 91) overallGrade = 'A+';
  else if (overallPercentage >= 81) overallGrade = 'A';
  else if (overallPercentage >= 71) overallGrade = 'B+';
  else if (overallPercentage >= 61) overallGrade = 'B';
  else if (overallPercentage >= 51) overallGrade = 'C';
  else if (overallPercentage >= 33) overallGrade = 'D';
  else overallGrade = 'E';

  // Overall remark calculation
  let overallRemark = 'Excellent';
  if (overallGrade === 'A+') overallRemark = 'Outstanding';
  else if (overallGrade === 'A') overallRemark = 'Excellent';
  else if (overallGrade === 'B+') overallRemark = 'Very Good';
  else if (overallGrade === 'B') overallRemark = 'Good';
  else if (overallGrade === 'C') overallRemark = 'Average';
  else if (overallGrade === 'D') overallRemark = 'Needs Improvement';
  else overallRemark = 'Fail';

  const isPass = report.summary?.passStatus === 'PASS';

  return (
    <div className="report-card-container w-full bg-white border-[3px] border-amber-600/90 p-1.5 sm:p-3 text-slate-900 font-sans shadow-lg relative my-auto box-border" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
      {/* Double Border Frame */}
      <div className="border-[2px] border-slate-900 p-2 sm:p-4 relative flex flex-col justify-between h-full bg-white box-border">
        
        {/* ================= 1. HEADER SECTION ================= */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 border-b-[2px] border-slate-900 pb-2">
            
            {/* Top Left: School Crest/Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
              {compiledSchool?.logo ? (
                <img src={compiledSchool.logo} alt="School Crest" className="w-full h-full object-contain" />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[2px] border-slate-900 bg-amber-50/50 flex flex-col items-center justify-center text-center p-1">
                  <span className="text-[14px]">🎓</span>
                  <span className="text-[8px] font-black uppercase text-slate-900 leading-tight">
                    {compiledSchool?.name ? compiledSchool.name.slice(0, 4).toUpperCase() : 'SCH'}
                  </span>
                </div>
              )}
            </div>

            {/* Top Center: School Name, Motto, and Ribbon Banner */}
            <div className="flex-1 text-center space-y-1 px-1">
              <h1 className="text-base sm:text-xl md:text-2xl font-black font-serif uppercase tracking-tight text-slate-900 leading-none">
                {compiledSchool?.name || 'BRIGHT FUTURE PUBLIC SCHOOL'}
              </h1>
              <div className="text-[9px] sm:text-[10px] font-extrabold text-amber-700 tracking-wider uppercase flex items-center justify-center gap-1">
                <span className="text-amber-500">★</span>
                <span>{compiledSchool?.motto || 'Excellence | Discipline | Success'}</span>
                <span className="text-amber-500">★</span>
              </div>
              
              {/* Ribbon Banner */}
              <div className="mt-1 flex justify-center">
                <div className="bg-slate-900 text-white px-6 sm:px-10 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xs border border-amber-500 shadow-xs relative inline-flex items-center gap-2">
                  <span className="text-amber-400 font-serif">‹</span>
                  <span>RESULTS CARD</span>
                  <span className="text-amber-400 font-serif">›</span>
                </div>
              </div>
            </div>

            {/* Top Right: Academic Year & Term Box */}
            <div className="w-28 sm:w-36 border-[2px] border-slate-900 rounded p-1 text-center text-[9px] font-bold space-y-0.5 bg-slate-50 flex-shrink-0">
              <div>
                <span className="text-[7.5px] text-slate-500 uppercase block tracking-wider font-extrabold leading-none">Academic Year</span>
                <span className="font-black text-slate-900 font-mono text-[11px] leading-tight block">{compiledTerm?.session || '2024 - 2025'}</span>
              </div>
              <div className="border-t border-slate-300 pt-0.5">
                <span className="text-[7.5px] text-slate-500 uppercase block tracking-wider font-extrabold leading-none">Term</span>
                <span className="font-black text-slate-900 uppercase text-[9.5px] leading-tight block truncate">{compiledTerm?.name || 'ANNUAL EXAMINATION'}</span>
              </div>
            </div>
          </div>

          {/* ================= 2. STUDENT DETAILS & GRADE SCALE GRID ================= */}
          <div className="grid grid-cols-12 gap-2 border-[2px] border-slate-900 p-2 rounded bg-white text-[10px] leading-snug">
            
            {/* Student Passport Photo */}
            <div className="col-span-3 flex items-center justify-center">
              <div className="w-24 h-28 border-[2px] border-slate-900 rounded overflow-hidden bg-sky-50 flex items-center justify-center shadow-xs">
                {report.student.passportPhoto ? (
                  <img src={report.student.passportPhoto} alt={report.student.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-1 text-slate-400 font-bold text-[9px]">
                    <span className="block text-xl mb-0.5">👤</span>
                    PHOTO
                  </div>
                )}
              </div>
            </div>

            {/* Student Details Column */}
            <div className="col-span-5 font-bold space-y-1 text-[10.5px] self-center">
              <div className="flex">
                <span className="w-28 text-slate-700 font-extrabold uppercase text-[9.5px]">STUDENT NAME</span>
                <span className="mr-1">:</span>
                <span className="font-black uppercase text-slate-900">{report.student.lastName} {report.student.firstName} {report.student.middleName || ''}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-700 font-extrabold uppercase text-[9.5px]">FATHER'S NAME</span>
                <span className="mr-1">:</span>
                <span className="uppercase text-slate-800">{report.student.fatherName || 'RAJESH SHARMA'}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-700 font-extrabold uppercase text-[9.5px]">MOTHER'S NAME</span>
                <span className="mr-1">:</span>
                <span className="uppercase text-slate-800">{report.student.motherName || 'POOJA SHARMA'}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-700 font-extrabold uppercase text-[9.5px]">CLASS & SECTION</span>
                <span className="mr-1">:</span>
                <span className="font-black text-slate-900">{report.student.className} - {report.student.armName}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-700 font-extrabold uppercase text-[9.5px]">ADMISSION NO.</span>
                <span className="mr-1">:</span>
                <span className="font-mono font-bold text-slate-900">{report.student.admissionNumber}</span>
              </div>
              {showPosition && (
                <div className="flex">
                  <span className="w-28 text-slate-700 font-extrabold uppercase text-[9.5px]">ROLL NO.</span>
                  <span className="mr-1">:</span>
                  <span className="font-mono font-bold text-slate-900">{report.summary.classPositionFormatted}</span>
                </div>
              )}
            </div>

            {/* Dates & Grade Scale Column */}
            <div className="col-span-4 space-y-1.5 text-[9.5px] font-bold">
              <div className="space-y-0.5 border-b border-slate-300 pb-1">
                <div className="flex justify-between">
                  <span className="text-slate-700 font-extrabold uppercase text-[8.5px]">DATE OF BIRTH</span>
                  <span>:</span>
                  <span className="font-mono text-slate-900">{report.student.dob || '12/05/2011'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700 font-extrabold uppercase text-[8.5px]">DATE OF ADMISSION</span>
                  <span>:</span>
                  <span className="font-mono text-slate-900">{report.student.dateOfAdmission || '01/04/2022'}</span>
                </div>
              </div>

              {/* Embedded Grade Scale Reference Box */}
              <div className="border border-slate-900 rounded overflow-hidden">
                <div className="bg-slate-900 text-white font-black text-[8px] uppercase tracking-wider text-center py-0.5">
                  GRADE SCALE
                </div>
                <table className="w-full text-[8px] text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-extrabold text-[7.5px] border-b border-slate-900">
                      <th className="p-0.5 border-r border-slate-900">GRADE</th>
                      <th className="p-0.5 border-r border-slate-900">MARKS RANGE</th>
                      <th className="p-0.5">REMARKS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 font-semibold text-slate-800 leading-tight">
                    <tr><td className="p-0.5 border-r border-slate-300 font-black">A+</td><td className="p-0.5 border-r border-slate-300">91 - 100</td><td className="p-0.5">Outstanding</td></tr>
                    <tr><td className="p-0.5 border-r border-slate-300 font-black">A</td><td className="p-0.5 border-r border-slate-300">81 - 90</td><td className="p-0.5">Excellent</td></tr>
                    <tr><td className="p-0.5 border-r border-slate-300 font-black">B+</td><td className="p-0.5 border-r border-slate-300">71 - 80</td><td className="p-0.5">Very Good</td></tr>
                    <tr><td className="p-0.5 border-r border-slate-300 font-black">B</td><td className="p-0.5 border-r border-slate-300">61 - 70</td><td className="p-0.5">Good</td></tr>
                    <tr><td className="p-0.5 border-r border-slate-300 font-black">C</td><td className="p-0.5 border-r border-slate-300">51 - 60</td><td className="p-0.5">Average</td></tr>
                    <tr><td className="p-0.5 border-r border-slate-300 font-black">D</td><td className="p-0.5 border-r border-slate-300">33 - 50</td><td className="p-0.5">Needs Improvement</td></tr>
                    <tr><td className="p-0.5 border-r border-slate-300 font-black">E</td><td className="p-0.5 border-r border-slate-300">32 & Below</td><td className="p-0.5">Fail</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ================= 3. ACADEMIC PERFORMANCE TABLE & RESULT SUMMARY ================= */}
          <div className="grid grid-cols-12 gap-2 items-start">
            
            {/* Subject Marks Table */}
            <div className="col-span-8 border-[2px] border-slate-900 rounded overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black text-[9.5px] uppercase tracking-wider">
                    <th className="p-1.5 border-r border-slate-700">SUBJECT</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-24">MAXIMUM MARKS</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-24">MARKS OBTAINED</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-24">PERCENTAGE (%)</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-16">GRADE</th>
                    <th className="p-1.5 text-center w-28">REMARKS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-bold text-slate-800 text-[10px]">
                  {report.subjects.map((sub, idx) => (
                    <tr key={sub.subjectId || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="p-1.5 border-r border-slate-300 uppercase font-black">{sub.subjectName}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold">100</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold">{sub.total}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold">{sub.total}%</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-black">{sub.grade}</td>
                      <td className="p-1.5 text-center font-semibold text-[9.5px]">{sub.remarks || 'Excellent'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                    <td className="p-1.5 border-r border-slate-700">TOTAL</td>
                    <td className="p-1.5 border-r border-slate-700 text-center font-mono">{totalMaxMarks}</td>
                    <td className="p-1.5 border-r border-slate-700 text-center font-mono">{totalMarksObtained}</td>
                    <td className="p-1.5 border-r border-slate-700 text-center font-mono">{overallPercentage}%</td>
                    <td className="p-1.5 border-r border-slate-700 text-center font-black">{overallGrade}</td>
                    <td className="p-1.5 text-center font-bold text-[9.5px]">{overallRemark}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Result Summary Card */}
            <div className="col-span-4 border-[2px] border-slate-900 rounded overflow-hidden bg-white">
              <div className="bg-slate-900 text-white font-black text-[9.5px] uppercase tracking-wider text-center py-1.5">
                RESULT SUMMARY
              </div>
              <div className="p-2.5 space-y-2.5 font-extrabold text-[10.5px]">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <span className="text-slate-600 uppercase text-[9px]">TOTAL MARKS</span>
                  <span className="font-mono text-slate-900">: {totalMaxMarks}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <span className="text-slate-600 uppercase text-[9px]">MARKS OBTAINED</span>
                  <span className="font-mono text-slate-900">: {totalMarksObtained}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <span className="text-slate-600 uppercase text-[9px]">PERCENTAGE</span>
                  <span className="font-mono text-slate-900">: {overallPercentage}%</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                  <span className="text-slate-600 uppercase text-[9px]">OVERALL GRADE</span>
                  <span className="font-black text-slate-900">: {overallGrade}</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-600 uppercase text-[9px]">RESULT</span>
                  <span className={`font-black text-[11px] px-3 py-0.5 rounded ${isPass ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                    : {report.summary?.passStatus || 'PASS'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ================= 4. FOOTER SECTION: REMARKS & SIGNATURES ================= */}
          <div className="grid grid-cols-12 gap-2 items-center border-t-[2px] border-slate-900 pt-2">
            
            {/* Left: Class Teacher Remarks */}
            <div className="col-span-5 border-[2px] border-slate-900 rounded p-1.5 text-[10px] bg-slate-50/50">
              <span className="block text-[8.5px] font-black uppercase text-slate-700 tracking-wider mb-0.5">
                CLASS TEACHER'S REMARKS
              </span>
              <p className="font-serif italic text-slate-800 text-[10px] leading-tight min-h-[32px]">
                "{report.comments?.teacher || 'A bright and hardworking student. Shows great interest in studies and activities. Keep up the excellent work!'}"
              </p>
              <div className="text-[7.5px] text-slate-400 font-mono font-bold mt-0.5">
                DATE: {new Date().toLocaleDateString()}
              </div>
            </div>

            {/* Center: Wreath Emblem Badge */}
            <div className="col-span-3 flex justify-center items-center">
              <div className="relative w-16 h-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full border-2 border-amber-600 border-dashed bg-amber-50 text-amber-900 font-black text-[8px] uppercase tracking-wider flex flex-col items-center justify-center p-0.5 shadow-xs border border-amber-300">
                  <span className="text-[7px] text-amber-600">★ ★ ★</span>
                  <span className="leading-none text-amber-950 font-black">WELL</span>
                  <span className="leading-none text-amber-950 font-black">DONE!</span>
                </div>
              </div>
            </div>

            {/* Right: Dual Signatures */}
            <div className="col-span-4 grid grid-cols-2 gap-1 text-center text-[9.5px] font-bold">
              <div className="space-y-0.5">
                <div className="h-6 flex items-end justify-center font-serif text-[10px] text-indigo-900 italic font-black">
                  {report.classTeacherName || 'Bijaya'}
                </div>
                <div className="border-t-[2px] border-slate-900 pt-0.5 text-slate-800 uppercase tracking-wider text-[8px] font-black">
                  CLASS TEACHER
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="h-6 flex items-end justify-center font-serif text-[10px] text-indigo-900 italic font-black">
                  Dr. A. B. Olumide
                </div>
                <div className="border-t-[2px] border-slate-900 pt-0.5 text-slate-800 uppercase tracking-wider text-[8px] font-black">
                  PRINCIPAL
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
