'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, UserPlus, Search, ShieldCheck, RefreshCw, X, AlertCircle, Edit, Trash2, CheckCircle, Eye, Mail, Phone, MapPin, UserCheck, GraduationCap, Sparkles
} from 'lucide-react';

import * as XLSX from 'xlsx';
import { FileSpreadsheet, UploadCloud, Download, Upload, Shield } from 'lucide-react';


interface StudentChild {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender?: string;
  dateOfBirth?: string | null;
  passportPhoto?: string | null;
  status?: string;
  createdAt?: string;
  class: { name: string };
  arm: { name: string };
}

interface ParentMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  students: StudentChild[];
  createdAt: string;
}

export default function ParentsRegistryPage() {
  const [parents, setParents] = useState<ParentMember[]>([]);

  // Bulk Excel Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedParents, setParsedParents] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const downloadTemplate = () => {
    const wsData = [
      { 'First Name': 'Babatunde', 'Last Name': 'Ojo', 'Email': 'babatunde.ojo@gmail.com', 'Phone': '+234 803 111 2222', 'Address': '12 Toyin Street, Ikeja, Lagos' },
      { 'First Name': 'Amara', 'Last Name': 'Chukwuma', 'Email': 'amara.chukwuma@yahoo.com', 'Phone': '+234 803 333 4444', 'Address': '45 Lekki Phase 1, Lagos' },
      { 'First Name': 'Fatima', 'Last Name': 'Yusuf', 'Email': 'fatima.yusuf@outlook.com', 'Phone': '+234 803 555 6666', 'Address': '78 Wuse 2, Abuja' }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'ParentsTemplate');
    XLSX.writeFile(wb, 'Parents_Upload_Template.xlsx');
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);

        const parsed: any[] = [];
        for (const r of rawRows) {
          const firstName = String(r['First Name'] || r['FirstName'] || r['Firstname'] || '').trim();
          const lastName = String(r['Last Name'] || r['LastName'] || r['Lastname'] || '').trim();
          const email = String(r['Email'] || r['Email Address'] || r['email'] || '').trim();
          const phone = String(r['Phone'] || r['Phone Number'] || r['phone'] || '').trim();
          const address = String(r['Address'] || r['address'] || '').trim();

          if (!firstName || !lastName || !email) continue;

          parsed.push({
            firstName,
            lastName,
            email,
            phone: phone || null,
            address: address || null
          });
        }

        setParsedParents(parsed);
        setUploadResult(null);
        setErrorMsg('');
      } catch (err) {
        setErrorMsg('Failed to parse Excel sheet. Ensure the file is not corrupted.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const triggerExcelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setUploading(true);

    if (parsedParents.length === 0) {
      setErrorMsg('No parent records parsed from Excel sheet to upload.');
      setUploading(false);
      return;
    }

    try {
      const res = await fetch('/api/parents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          parents: parsedParents
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload parents list');

      setUploadResult(json.data);
      setSuccessMsg(`Bulk parents registration complete: successfully imported ${json.data.successCount} accounts!`);
      setParsedParents([]);
      setShowUploadModal(false);
      
      // Refresh parents directory
      await loadParents(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing bulk upload.');
    } finally {
      setUploading(false);
    }
  };

  const [students, setStudents] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentMember | null>(null);
  const [viewingParent, setViewingParent] = useState<ParentMember | null>(null);
  const [viewingStudent, setViewingStudent] = useState<any | null>(null);
  const [extendedStudentDetail, setExtendedStudentDetail] = useState<any | null>(null);
  const [showExtendedView, setShowExtendedView] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'scores' | 'attendance' | 'comments'>('scores');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [childSearchQuery, setChildSearchQuery] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        loadParents(sessionObj.school.id);
        loadStudents(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Invalid session credentials.');
      }
    }
  }, []);

  const loadParents = async (schoolId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/parents?schoolId=${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch parent accounts');
      setParents(json.data || []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with parent database.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/students?schoolId=${schoolId}&status=ALL`);
      const json = await res.json();
      if (res.ok) {
        setStudents(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const handleRegisterParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setErrorMsg('Mandatory fields (First Name, Last Name, Email) must be filled.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/parents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          firstName,
          lastName,
          email,
          phone,
          address,
          studentIds: selectedStudentIds
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register parent profile.');

      setSuccessMsg(`Parent profile successfully created for Mr./Mrs. ${lastName}! Account logins auto-provisioned.`);
      resetForm();
      setShowAddModal(false);
      await loadParents(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParent) return;

    if (!firstName || !lastName || !email) {
      setErrorMsg('Mandatory fields (First Name, Last Name, Email) must be filled.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/parents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedParent.id,
          firstName,
          lastName,
          email,
          phone,
          address,
          studentIds: selectedStudentIds
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update parent profile.');

      setSuccessMsg(`Parent profile for Mr./Mrs. ${lastName} updated successfully!`);
      resetForm();
      setShowEditModal(false);
      await loadParents(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating parent.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteParent = async (parent: ParentMember) => {
    if (!window.confirm(`Are you sure you want to permanently delete parent ${parent.firstName} ${parent.lastName}? This will also delete their active system login.`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/parents?id=${parent.id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete parent account.');

      setSuccessMsg(`Parent profile and matching logins permanently deleted successfully.`);
      await loadParents(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting parent.');
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setSelectedStudentIds([]);
    setChildSearchQuery('');
    setSelectedParent(null);
  };

  const openEditModal = (parent: ParentMember) => {
    setSelectedParent(parent);
    setFirstName(parent.firstName);
    setLastName(parent.lastName);
    setEmail(parent.email);
    setPhone(parent.phone || '');
    setAddress(parent.address || '');
    setSelectedStudentIds(parent.students.map(s => s.id));
    setShowEditModal(true);
  };

  // SEARCH AND PAGINATION FILTERS
  const filteredParents = parents.filter(p => {
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
    const emailSearch = p.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || emailSearch.includes(query);
  });

  const totalItems = filteredParents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentParents = filteredParents.slice(startIndex, endIndex);

  // Available students to allocate filter
  const filteredStudentsForAllocation = students.filter(st => {
    const studentName = `${st.firstName} ${st.lastName} ${st.admissionNumber}`.toLowerCase();
    return studentName.includes(childSearchQuery.toLowerCase());
  });

  const toggleStudentSelection = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const themeAccentColor = school?.slug === 'greenwood-secondary' ? 'text-emerald-600' : 'text-indigo-600';
  const themeBgAccent = school?.slug === 'greenwood-secondary' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className={`w-6 h-6 ${themeAccentColor}`} /> Parents Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Manage student guardians, phone contacts, linked home accounts, and access credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setUploadResult(null);
              setParsedParents([]);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm shadow-slate-100 cursor-pointer animate-fadeIn"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-650" /> Bulk Upload Parents
          </button>

          <button
            type="button"
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md cursor-pointer ${themeBgAccent}`}
          >
            <UserPlus className="w-4 h-4" /> Add Parent
          </button>
        </div>

      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-150 text-green-600 text-xs flex items-center justify-between font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-150 text-red-650 text-xs flex items-center justify-between font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {/* Directory Table and Search Controls */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
        
        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by guardian name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-150 rounded-2xl pl-9 pr-4 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-300 h-[38px]"
            />
            <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="text-[11px] text-slate-400 font-bold">
            Showing {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} of {totalItems} parent accounts
          </div>
        </div>

        {/* Directory Table */}
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-6 h-6 border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-xs font-semibold">Accessing guardians ledger...</p>
            </div>
          </div>
        ) : currentParents.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-3xl space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">No matching parent accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4">Guardian Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Phone Number</th>
                  <th className="p-4">Registered Children</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentParents.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Guardian Name */}
                    <td className="p-4">
                      <span className="font-extrabold text-sm text-slate-800 block">
                        Mr./Mrs. {row.lastName} {row.firstName}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="p-4 text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {row.email}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="p-4 text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {row.phone || <em className="text-slate-350 text-[10px] font-semibold font-sans">None</em>}
                      </span>
                    </td>

                    {/* Linked Children */}
                    <td className="p-4">
                      {row.students && row.students.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.students.map((student) => (
                            <span key={student.id} className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100">
                              {student.lastName} {student.firstName[0]}. ({student.class?.name || ''})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold italic">No wards registered</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingParent(row)}
                          className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-450 hover:text-slate-800 transition-colors"
                          title="View complete profile card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-450 hover:text-slate-800 transition-colors"
                          title="Edit details"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParent(row)}
                          className="p-1.5 rounded-xl hover:bg-slate-50 text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete parent and credentials"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sliding Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-slate-50 pt-4">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              Previous Page
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    currentPage === p
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              Next Page
            </button>
          </div>
        )}

      </div>

      {/* Details Viewing Drawer */}
      {viewingParent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-fadeIn">
            <button
              type="button"
              onClick={() => setViewingParent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center font-black text-sm border border-slate-200">
                  {viewingParent.firstName[0].toUpperCase()}{viewingParent.lastName[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Mr./Mrs. {viewingParent.lastName} {viewingParent.firstName}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Student Guardian Profile</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs font-semibold text-slate-500">
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> <span className="text-slate-400">Email:</span> <strong className="text-slate-700 font-mono">{viewingParent.email}</strong></p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> <span className="text-slate-400">Phone:</span> <strong className="text-slate-700 font-mono">{viewingParent.phone || 'None'}</strong></p>
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> <span className="text-slate-400">Address:</span> <strong className="text-slate-700">{viewingParent.address || 'None'}</strong></p>
                <p className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-slate-400" /> <span className="text-slate-400">Join Date:</span> <strong className="text-slate-700">{new Date(viewingParent.createdAt).toLocaleDateString()}</strong></p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[10px] font-black uppercase text-slate-450 mb-2">Academic Wards ({viewingParent.students?.length || 0})</h4>
                {viewingParent.students && viewingParent.students.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {viewingParent.students.map((st) => (
                      <div 
                        key={st.id} 
                        onClick={async () => {
                          // Connect parent information to viewingStudent record so demographics render parent details perfectly
                          const studentWithParent = {
                            ...st,
                            parent: viewingParent
                          };
                          setViewingParent(null); // Dismiss parent details drawer
                          setViewingStudent(studentWithParent);
                          setShowExtendedView(false);
                          setExtendedStudentDetail(null);
                          setLoadingDetail(true);
                          try {
                            const res = await fetch(`/api/students?studentId=${st.id}`);
                            const json = await res.json();
                            if (res.ok && json.data) {
                              setExtendedStudentDetail(json.data);
                            }
                          } catch (e) {
                            console.error("Error fetching ward details:", e);
                          } finally {
                            setLoadingDetail(false);
                          }
                        }}
                        className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 hover:bg-blue-50/40 p-2 rounded-xl border border-slate-150 cursor-pointer select-none group transition-all duration-200"
                        title="Click to view ward comprehensive profile card"
                      >
                        <span className="group-hover:text-blue-700 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          {st.lastName} {st.firstName}
                        </span>
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 group-hover:bg-blue-100 transition-colors">
                          {st.class?.name} Arm {st.arm?.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold italic">No wards registered under this parent profile.</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingParent(null)}
                  className="py-2 px-5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Parent Drawer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <UserPlus className={`w-4 h-4 ${themeAccentColor}`} /> Add Parent Guardian Profile
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterParent} className="p-6 flex flex-col space-y-4 text-xs font-semibold overflow-hidden">
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1.5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grace"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Last Name (Surname)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adenike"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Guardian Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 15 Ikoyi Link Road, Lagos"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300"
                  />
                </div>

                {/* Bind Students Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Link Students (Academic Wards)</span>
                  
                  {/* Search children */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search children by name or ID..."
                      value={childSearchQuery}
                      onChange={(e) => setChildSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-[11px] font-bold text-slate-700 placeholder-slate-400 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-200 bg-white p-2 rounded-xl space-y-1.5 shadow-inner">
                    {filteredStudentsForAllocation.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-4">No matching student found.</p>
                    ) : (
                      filteredStudentsForAllocation.map((st) => {
                        const isSelected = selectedStudentIds.includes(st.id);
                        return (
                          <div 
                            key={st.id}
                            onClick={() => toggleStudentSelection(st.id)}
                            className={`flex justify-between items-center p-2 rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100/70'
                            }`}
                          >
                            <span>{st.lastName} {st.firstName} <span className="font-mono text-[9px] text-slate-400">({st.admissionNumber})</span></span>
                            <span className="text-[9px] font-black bg-white px-2 py-0.5 rounded border">
                              {st.class?.name} Arm {st.arm?.name}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all disabled:opacity-50 ${themeBgAccent}`}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Registering...' : 'Provision Login Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Parent Drawer Modal */}
      {showEditModal && selectedParent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Edit className={`w-4 h-4 ${themeAccentColor}`} /> Edit Guardian Profile
              </h3>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateParent} className="p-6 flex flex-col space-y-4 text-xs font-semibold overflow-hidden">
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1.5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grace"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Last Name (Surname)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adenike"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Guardian Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Residential Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 15 Ikoyi Link Road, Lagos"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none"
                  />
                </div>

                {/* Bind Students Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Link Students (Academic Wards)</span>
                  
                  {/* Search children */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search children by name or ID..."
                      value={childSearchQuery}
                      onChange={(e) => setChildSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-[11px] font-bold text-slate-700 placeholder-slate-400 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-200 bg-white p-2 rounded-xl space-y-1.5 shadow-inner">
                    {filteredStudentsForAllocation.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-4">No matching student found.</p>
                    ) : (
                      filteredStudentsForAllocation.map((st) => {
                        const isSelected = selectedStudentIds.includes(st.id);
                        return (
                          <div 
                            key={st.id}
                            onClick={() => toggleStudentSelection(st.id)}
                            className={`flex justify-between items-center p-2 rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-colors ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100/70'
                            }`}
                          >
                            <span>{st.lastName} {st.firstName} <span className="font-mono text-[9px] text-slate-400">({st.admissionNumber})</span></span>
                            <span className="text-[9px] font-black bg-white px-2 py-0.5 rounded border">
                              {st.class?.name} Arm {st.arm?.name}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all disabled:opacity-50 ${themeBgAccent}`}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Student Details Viewing Drawer */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-150 rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300 animate-fadeIn ${
            showExtendedView ? 'max-w-4xl w-full' : 'max-w-md w-full'
          }`}>
            
            {/* Modal Header bar */}
            <div className={`px-6 py-5 flex items-center justify-between border-b border-slate-50 ${
              school?.slug === 'greenwood-secondary' ? 'bg-emerald-50/30' : 'bg-indigo-50/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                  school?.slug === 'greenwood-secondary' ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950">
                    {showExtendedView ? 'Comprehensive Academic Record' : 'Student Registry Card'}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    {showExtendedView ? 'Full Profile Analytics' : 'Enrollment Ledger Metadata'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center shadow-sm text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content layout */}
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              {!showExtendedView ? (
                // 1. Initial General View (Showing the 10 Essential Fields)
                <div className="space-y-6">
                  {/* Photo & Name Identity Card */}
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="w-16 h-16 rounded-2xl border-2 border-white overflow-hidden bg-white shadow-md flex items-center justify-center flex-shrink-0">
                      {viewingStudent.passportPhoto ? (
                        <img src={viewingStudent.passportPhoto} alt="Passport preview" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-350" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-800 leading-tight">
                        {viewingStudent.lastName}, {viewingStudent.firstName} {viewingStudent.middleName || ''}
                      </h4>
                      <span className="text-[10px] text-slate-450 font-bold tracking-wider font-mono bg-white px-2 py-0.5 border border-slate-150 rounded-md mt-1 inline-block">
                        Admin ID: {viewingStudent.admissionNumber}
                      </span>
                    </div>
                  </div>

                  {/* Core 10 Fields Attributes Grid */}
                  <div className="space-y-4">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-1">
                      Essential Demographic & Cohort Coordinates
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Class Grade:</span>
                        <strong className="text-slate-700">{viewingStudent.class?.name}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Stream / Arm:</span>
                        <strong className="text-slate-700">Arm {viewingStudent.arm?.name}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Biological Gender:</span>
                        <strong className="text-slate-700">{viewingStudent.gender || 'Not Provided'}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Date of Birth:</span>
                        <strong className="text-slate-700 font-mono">{viewingStudent.dateOfBirth || 'Not Provided'}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Clearance status:</span>
                        <strong className={viewingStudent.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}>
                          {viewingStudent.status || 'ACTIVE'}
                        </strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Enrollment Date:</span>
                        <strong className="text-slate-700 font-mono">
                          {viewingStudent.createdAt ? new Date(viewingStudent.createdAt).toLocaleDateString() : 'N/A'}
                        </strong>
                      </div>
                    </div>

                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-1 pt-2">
                      Primary Parent / Guardian Contact Details
                    </span>

                    <div className="space-y-2 text-xs font-semibold text-slate-500">
                      <div className="flex justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Parent/Guardian Name:</span>
                        <strong className="text-slate-700">
                          {viewingStudent.parent 
                            ? `Mr./Mrs. ${viewingStudent.parent.lastName} ${viewingStudent.parent.firstName}`
                            : 'Not Assigned'
                          }
                        </strong>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Parent phone Contact:</span>
                        <strong className="text-slate-750 font-mono">
                          {viewingStudent.parent?.phone || 'Not Provided'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-50 justify-end font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewingStudent(null)}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                    >
                      Close Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExtendedView(true)}
                      className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black text-white shadow-md cursor-pointer ${themeBgAccent}`}
                    >
                      <span>View More Details</span>
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    </button>
                  </div>
                </div>
              ) : (
                // 2. Extended Detailed Analytics View (Tabs console)
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column Profile snapshot sidebar */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-3xl text-center space-y-3">
                      <div className="w-20 h-20 rounded-2xl border-2 border-white overflow-hidden bg-white shadow-md flex items-center justify-center mx-auto shadow-slate-100">
                        {viewingStudent.passportPhoto ? (
                          <img src={viewingStudent.passportPhoto} alt="Passport" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-10 h-10 text-slate-350" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-tight">
                          {viewingStudent.lastName}, {viewingStudent.firstName}
                        </h4>
                        <span className="text-[9px] font-bold font-mono tracking-wider bg-white px-2 py-0.5 border border-slate-150 rounded text-slate-500 mt-1 inline-block">
                          ID: {viewingStudent.admissionNumber}
                        </span>
                      </div>

                      <div className="border-t border-slate-200/60 pt-3 text-[11px] font-semibold text-slate-500 space-y-1.5 text-left">
                        <div className="flex justify-between"><span>Grade:</span> <strong className="text-slate-700">{viewingStudent.class?.name} Arm {viewingStudent.arm?.name}</strong></div>
                        <div className="flex justify-between"><span>Gender:</span> <strong className="text-slate-700">{viewingStudent.gender || 'Not Provided'}</strong></div>
                        <div className="flex justify-between"><span>DOB:</span> <strong className="text-slate-700 font-mono">{viewingStudent.dateOfBirth || 'Not Provided'}</strong></div>
                        <div className="flex justify-between"><span>Parent Name:</span> <strong className="text-slate-750">{viewingStudent.parent ? `${viewingStudent.parent.firstName} ${viewingStudent.parent.lastName}` : 'N/A'}</strong></div>
                        <div className="flex justify-between"><span>Parent Contact:</span> <strong className="text-slate-700 font-mono">{viewingStudent.parent?.phone || 'N/A'}</strong></div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowExtendedView(false)}
                      className="w-full py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      ← Back to General Info
                    </button>
                  </div>

                  {/* Right Column Profile Tab content */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Tab Navigation header */}
                    <div className="flex border-b border-slate-100 gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-150">
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('scores')}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeDetailTab === 'scores' 
                            ? 'bg-white text-slate-850 shadow-sm border border-slate-100 font-black' 
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Academic Scores
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('attendance')}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeDetailTab === 'attendance' 
                            ? 'bg-white text-slate-850 shadow-sm border border-slate-100 font-black' 
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Attendance Logs
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('comments')}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeDetailTab === 'comments' 
                            ? 'bg-white text-slate-850 shadow-sm border border-slate-100 font-black' 
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Teacher Comments
                      </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="bg-white border border-slate-150 rounded-3xl p-5 min-h-[220px]">
                      {loadingDetail ? (
                        <div className="h-44 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <div className="w-5 h-5 border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Synchronizing files...</p>
                          </div>
                        </div>
                      ) : extendedStudentDetail ? (
                        <>
                          {/* 1. Academic Scores Tab */}
                          {activeDetailTab === 'scores' && (
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Academic Performance Summary</span>
                              
                              {!extendedStudentDetail.scores || extendedStudentDetail.scores.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                  No academic scores recorded for this student in the current session.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-100 max-h-[260px] overflow-y-auto">
                                  <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="p-3">Subject Name</th>
                                        <th className="p-3 text-center">CA (30)</th>
                                        <th className="p-3 text-center">Assign (10)</th>
                                        <th className="p-3 text-center">Exam (60)</th>
                                        <th className="p-3 text-center">Total (100)</th>
                                        <th className="p-3 text-center">Grade</th>
                                        <th className="p-3 text-center">Term</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {extendedStudentDetail.scores.map((score: any) => {
                                        const caTotal = (score.ca1 || 0) + (score.ca2 || 0);
                                        const total = caTotal + (score.assignment || 0) + (score.exam || 0);
                                        return (
                                          <tr key={score.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 font-extrabold text-slate-800 text-[11px]">
                                              {score.subject?.name}
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-mono font-bold text-[11px]">
                                              {caTotal}
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-mono font-bold text-[11px]">
                                              {score.assignment || 0}
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-mono font-bold text-[11px]">
                                              {score.exam || 0}
                                            </td>
                                            <td className="p-3 text-center font-black text-blue-650 font-mono text-sm">
                                              {total}
                                            </td>
                                            <td className="p-3 text-center">
                                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black border bg-blue-50 text-blue-650 border-blue-100">
                                                {score.grade || 'N/A'}
                                              </span>
                                            </td>
                                            <td className="p-3 text-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                                              {score.term?.name?.split(' ')?.[0] || score.term?.name || 'N/A'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. Attendance Ledger Tab */}
                          {activeDetailTab === 'attendance' && (
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Attendance registry</span>
                              
                              {!extendedStudentDetail.attendance || extendedStudentDetail.attendance.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                  No attendance logs drafted for this student yet.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                  <table className="w-full border-collapse text-left text-xs font-semibold text-slate-650">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-450">
                                        <th className="p-3">Academic Term</th>
                                        <th className="p-3 text-center">Present</th>
                                        <th className="p-3 text-center">Absent</th>
                                        <th className="p-3 text-center">Ratio Rate</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {extendedStudentDetail.attendance.map((att: any) => {
                                        const totalDays = (att.daysPresent || 0) + (att.daysAbsent || 0);
                                        const rate = totalDays > 0 ? Math.round(((att.daysPresent || 0) / totalDays) * 100) : 0;
                                        return (
                                          <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 font-extrabold text-slate-800 text-[11px]">
                                              {att.term?.name || 'Academic Term'}
                                            </td>
                                            <td className="p-3 text-center font-bold text-slate-500 font-mono">
                                              {att.daysPresent || 0} days
                                            </td>
                                            <td className="p-3 text-center font-bold text-slate-450 font-mono">
                                              {att.daysAbsent || 0} days
                                            </td>
                                            <td className="p-3 text-center">
                                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                                rate >= 90 
                                                  ? 'bg-green-50 text-green-600 border-green-100' 
                                                  : rate >= 75 
                                                  ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                                  : 'bg-red-50 text-red-600 border-red-100'
                                              }`}>
                                                {rate}%
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Teacher Remarks Tab */}
                          {activeDetailTab === 'comments' && (
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Teacher & Dean Remarks</span>
                              
                              {!extendedStudentDetail.reportComments || extendedStudentDetail.reportComments.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                  No official reports comments logged for this student.
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                  {extendedStudentDetail.reportComments.map((comment: any) => (
                                    <div key={comment.id} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                                      <div className="flex justify-between items-center border-b border-slate-200/50 pb-1.5">
                                        <span className="font-extrabold text-[10px] text-slate-700 uppercase tracking-wider">
                                          {comment.term?.name || 'Academic Term'}
                                        </span>
                                      </div>
                                      
                                      {comment.teacherComment && (
                                        <div className="text-[11px] leading-relaxed text-slate-600">
                                          <strong className="text-slate-800 text-[10px] block font-black uppercase text-slate-400 tracking-wider">Class Teacher Comment:</strong>
                                          <p className="mt-0.5 italic">"{comment.teacherComment}"</p>
                                        </div>
                                      )}

                                      {comment.principalComment && (
                                        <div className="text-[11px] leading-relaxed text-slate-600 border-t border-slate-100 pt-2 mt-2">
                                          <strong className="text-slate-800 text-[10px] block font-black uppercase text-slate-400 tracking-wider">Principal Comment:</strong>
                                          <p className="mt-0.5 italic">"{comment.principalComment}"</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-8 text-center text-slate-450 text-xs font-bold uppercase tracking-wider">
                          Error loading database relations
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Modal bottom-bar */}
            {showExtendedView && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between font-semibold">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  School Results Automation platform
                </span>
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  Close Workspace
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Bulk Excel Upload Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" /> Bulk Import Parents
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setParsedParents([]);
                  setUploadResult(null);
                }}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 font-semibold text-xs text-left">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">Excel Import</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                  Upload an Excel spreadsheet to import your student guardians / parent roster in bulk. Download the template, fill in the records, and upload.
                </p>
              </div>

              {/* Download Template Panel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="block text-xs font-extrabold text-slate-800">Parents Roster Template</span>
                  <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Columns: First Name, Last Name, Email, Phone, Address</span>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold transition-all border border-slate-200 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Template
                </button>
              </div>

              {/* Upload Drop Zone / Input */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Upload Spreadsheet (.xlsx, .xls)</label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-350 bg-slate-50 rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center text-center space-y-2">
                  <UploadCloud className="w-8 h-8 text-slate-300" />
                  <div>
                    <span className="block text-xs font-bold text-slate-700">Choose or drag Excel file here</span>
                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Max 5MB · .xlsx or .xls only</span>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>

              {/* Live Preview Registry Grid */}
              {parsedParents.length > 0 && (
                <div className="space-y-2 animate-fadeIn">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Preview — {parsedParents.length} guardian accounts found
                  </span>
                  <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                        {parsedParents.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-extrabold text-slate-800">{p.lastName}, {p.firstName}</td>
                            <td className="py-2 px-3">{p.email}</td>
                            <td className="py-2 px-3">{p.phone || '-'}</td>
                            <td className="py-2 px-3 text-[11px] max-w-xs truncate">{p.address || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {uploadResult && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn text-[11px]">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-800">Import Results</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="text-emerald-600 font-bold">✓ {uploadResult.successCount} imported successfully</div>
                    <div className="text-red-500 font-bold">✗ {uploadResult.failCount} failed/skipped</div>
                  </div>
                  {uploadResult.failures.length > 0 && (
                    <div className="space-y-1 max-h-36 overflow-y-auto text-[10px] font-mono border-t border-slate-200 pt-2 text-red-500">
                      {uploadResult.failures.map((f: any, i: number) => (
                        <div key={i} className="leading-relaxed">
                          ⚠️ {f.name} ({f.email}): {f.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setParsedParents([]);
                  setUploadResult(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer"
              >
                Close
              </button>
              {parsedParents.length > 0 && (
                <button
                  type="button"
                  onClick={triggerExcelUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {uploading ? 'Importing...' : 'Run Bulk Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const dynamic = 'force-dynamic';

