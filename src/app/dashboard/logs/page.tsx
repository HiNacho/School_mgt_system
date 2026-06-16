'use client';

import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Computer, 
  Smartphone, 
  Globe, 
  Clock, 
  User, 
  School,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, SUCCESS, FAILURE
  const [schoolFilter, setSchoolFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('report_auth_token');
      
      // If Super Admin, fetch schools list first for the filter dropdown
      if (session?.user?.role === 'SUPER_ADMIN' && schools.length === 0) {
        const schoolRes = await fetch('/api/schools', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const schoolJson = await schoolRes.json();
        if (schoolRes.ok && schoolJson.data) {
          setSchools(schoolJson.data);
        }
      }

      // Build logs URL
      let url = '/api/superadmin/logs';
      if (session?.user?.role === 'SUPER_ADMIN' && schoolFilter !== 'ALL') {
        url += `?schoolId=${schoolFilter}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to retrieve access audit logs');

      setLogs(json.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error communicating with SQL log database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSession(sessionObj);
      } catch (e) {
        setErrorMsg('Failed to parse active user context.');
      }
    }
  }, []);

  // Fetch logs whenever session is loaded or school filter changes
  useEffect(() => {
    if (session) {
      fetchLogs();
    }
  }, [session, schoolFilter]);

  // Reset page when search or other filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, schoolFilter]);

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Duration helper
  const getSessionDuration = (loginStr: string, logoutStr: string | null) => {
    if (!logoutStr) return 'Active session';
    const login = new Date(loginStr).getTime();
    const logout = new Date(logoutStr).getTime();
    const diffMs = logout - login;
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `${diffHours} hr ${diffMins % 60} min`;
    }
    if (diffMins > 0) {
      return `${diffMins} min`;
    }
    return `${diffSecs} sec`;
  };

  // Filter logs list
  const filteredLogs = logs.filter(log => {
    const searchString = `${log.user?.firstName || ''} ${log.user?.lastName || ''} ${log.user?.email || ''} ${log.user?.username || ''} ${log.ipAddress || ''} ${log.deviceInfo || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || log.user?.role === roleFilter;
    
    // Status checking: logoutTime exists or isSuccess properties
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && !log.logoutTime) || 
      (statusFilter === 'CLOSED' && log.logoutTime);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Paginated logs
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const isGreenwood = session?.school?.slug === 'greenwood-secondary';
  const accentText = isGreenwood ? 'text-emerald-500' : 'text-indigo-500';
  const accentBg = isGreenwood ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  const buttonPrimary = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-100';

  if (!session) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-slate-400 text-xs font-semibold">Validating authorization credentials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${accentBg}`}>
              <FileText className="w-5 h-5" />
            </div>
            System Access Audit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
            {session.user.role === 'SUPER_ADMIN' 
              ? 'Multi-tenant diagnostic logs. Review recent login history, logout sessions, IP addresses, and device agents across all schools.'
              : 'Review recent login operations, active session durations, and client agents inside your school context.'
            }
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Logs
        </button>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-650" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        </div>
      )}

      {/* 2. Filters card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, username, IP, browser..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-slate-350 placeholder-slate-400 h-[38px]"
            />
            <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Role Filter */}
          <div className="w-full md:w-48 relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-slate-350 h-[38px] appearance-none"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admins</option>
              <option value="SCHOOL_ADMIN">School Admins</option>
              <option value="CLASS_TEACHER">Class Teachers</option>
              <option value="SUBJECT_TEACHER">Subject Teachers</option>
              <option value="PARENT">Parents</option>
              <option value="STUDENT">Students</option>
            </select>
            <User className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Session Status Filter */}
          <div className="w-full md:w-48 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-slate-350 h-[38px] appearance-none"
            >
              <option value="ALL">All Sessions</option>
              <option value="ACTIVE">Active Sessions</option>
              <option value="CLOSED">Completed Sessions</option>
            </select>
            <Clock className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Super Admin School Filter */}
          {session.user.role === 'SUPER_ADMIN' && (
            <div className="w-full md:w-64 relative">
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:border-slate-350 h-[38px] appearance-none"
              >
                <option value="ALL">All Tenant Schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <School className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
        </div>
      </div>

      {/* 3. Table list */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            <p className="text-slate-400 text-xs font-semibold">Syncing database audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-55 rounded-full flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <div className="max-w-xs mx-auto space-y-1">
              <h4 className="text-xs font-extrabold text-slate-800">No Logs Found</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                No session audit trails matches your active search and filter coordinates.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  {session.user.role === 'SUPER_ADMIN' && <th className="px-6 py-4">School Scope</th>
                  }
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Device & Browser</th>
                  <th className="px-6 py-4">Access Session Details</th>
                  <th className="px-6 py-4">Lifetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log: any) => {
                  const isSuccess = true; // LoginAuditLog records are always successful logins
                  const deviceAgent = log.deviceInfo || 'Unknown client';
                  const isMobile = /mobile|android|iphone/i.test(deviceAgent);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* User details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-extrabold shrink-0 border border-slate-150">
                            {log.user?.firstName ? `${log.user.lastName[0]}${log.user.firstName[0]}` : 'U'}
                          </div>
                          <div>
                            <span className="block text-slate-900 font-bold text-xs truncate max-w-[150px]">
                              {log.user?.lastName} {log.user?.firstName}
                            </span>
                            <span className="block text-slate-400 font-normal text-[10px] truncate max-w-[150px]">
                              @{log.user?.username || 'no-username'} • {log.user?.email}
                            </span>
                            {/* Role badge */}
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[8px] uppercase tracking-wider text-slate-500 font-black mt-1">
                              {log.user?.role?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* School Tenant */}
                      {session.user.role === 'SUPER_ADMIN' && (
                        <td className="px-6 py-4 text-slate-700">
                          <span className="font-bold truncate max-w-[120px] block" title={log.user?.school?.name}>
                            {log.user?.school?.name || 'Global Override'}
                          </span>
                        </td>
                      )}

                      {/* IP address */}
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          {log.ipAddress || '127.0.0.1'}
                        </span>
                      </td>

                      {/* Device info */}
                      <td className="px-6 py-4 max-w-[180px]">
                        <div className="flex items-center gap-2">
                          {isMobile ? (
                            <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          ) : (
                            <Computer className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <span className="text-[10px] text-slate-500 truncate" title={deviceAgent}>
                            {deviceAgent}
                          </span>
                        </div>
                      </td>

                      {/* Access Session Details */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-emerald-500 text-[8px]">●</span>
                            <span className="text-slate-400">In:</span>
                            <span className="font-mono text-slate-600">{formatDate(log.loginTime)}</span>
                          </div>
                          {log.logoutTime ? (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-slate-400 text-[8px]">●</span>
                              <span className="text-slate-400">Out:</span>
                              <span className="font-mono text-slate-600">{formatDate(log.logoutTime)}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-emerald-500 animate-pulse text-[8px]">●</span>
                              <span className="text-emerald-600 font-bold">Active Connection</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Session Lifetime */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{getSessionDuration(log.loginTime, log.logoutTime)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-600 font-bold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

    </div>
  );
}
