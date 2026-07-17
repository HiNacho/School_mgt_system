'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  MessageSquare, Send, CheckCircle, AlertCircle, Users, 
  RefreshCw, Calendar, Megaphone, Inbox, Bookmark, Eye,
  AlertTriangle, Clock, ArrowRight, ShieldAlert, Award, FileText,
  ArrowLeft, Check, BookOpen, Sparkles, Filter, Search, Plus, 
  Settings, CheckSquare, XCircle, UserCheck, Paperclip, ChevronRight
} from 'lucide-react';

interface ChatConversation {
  id: string;
  category: string;
  subject: string;
  status: string;
  lastActivity: string;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    className: string;
    armName: string;
  };
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface CommunicationTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface CommunicationSettings {
  communicationHoursStart: string;
  communicationHoursEnd: string;
  whoCanMessageWhom: string;
  maxAttachmentSizeMb: number;
  messageRetentionDays: number;
  autoCloseInactivityDays: number;
  directSubjectTeacherContact: boolean;
}

interface MeetingRequest {
  id: string;
  type: string;
  reason: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  statusReason: string | null;
  suggestedDate: string | null;
  suggestedTime: string | null;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    className: string;
    armName: string;
  };
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface BroadcastMessage {
  id: string;
  title: string;
  body: string;
  messageType: string;
  targetAudience: string;
  priority: string;
  isPinned: boolean;
  createdAt: string;
  sender?: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

export default function RebuiltMessagesHub() {
  // Session details
  const [school, setSchool] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Tabs layout
  const [activeTab, setActiveTab] = useState<'chats' | 'broadcasts' | 'meetings' | 'settings' | 'analytics'>('chats');
  
  // Structured messaging states
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [chatCategoryFilter, setChatCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Smart template states
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplateText, setSelectedTemplateText] = useState('');

  // Scrolling ref to keep chat input visible and auto-scroll message list to bottom (like WhatsApp)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChatMessages]);

  const refreshActiveConversation = async (convId: string) => {
    if (!school) return;
    try {
      const res = await fetch(`/api/communication?schoolId=${school.id}&conversationId=${convId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const newMessages = json.data.messages || [];
        setActiveChatMessages(prev => {
          if (prev.length !== newMessages.length || (prev.length > 0 && prev[prev.length - 1].id !== newMessages[newMessages.length - 1].id)) {
            return newMessages;
          }
          return prev;
        });
      }
    } catch (e) {
      console.error('Error polling conversation:', e);
    }
  };

  const refreshConversationsList = async () => {
    if (!school) return;
    try {
      const res = await fetch(`/api/communication?schoolId=${school.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setConversations(json.data.conversations || []);
      }
    } catch (e) {
      console.error('Error polling conversations list:', e);
    }
  };

  // Near-real-time polling interval for live message delivery (like WhatsApp)
  useEffect(() => {
    if (activeTab !== 'chats' || !school) return;

    const pollInterval = setInterval(() => {
      refreshConversationsList();
      if (selectedConversation) {
        refreshActiveConversation(selectedConversation.id);
      }
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(pollInterval);
  }, [selectedConversation?.id, activeTab, school]);

  // Meeting scheduler states
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  
  // Meeting form fields (parent only)
  const [meetingStudentId, setMeetingStudentId] = useState('');
  const [meetingTeacherId, setMeetingTeacherId] = useState('');
  const [meetingType, setMeetingType] = useState('PHYSICAL');
  const [meetingReason, setMeetingReason] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  
  // Meeting actions modal states
  const [selectedMeetingForAction, setSelectedMeetingForAction] = useState<{ id: string; status: 'APPROVED' | 'DECLINED' } | null>(null);
  const [actionReason, setActionReason] = useState('');

  // Chat initiation states (parent only)
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatStudentId, setNewChatStudentId] = useState('');
  const [newChatTeacherId, setNewChatTeacherId] = useState('');
  const [newChatBody, setNewChatBody] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Dropdown list resources
  const [myWards, setMyWards] = useState<any[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);

  // Settings states
  const [settings, setSettings] = useState<CommunicationSettings>({
    communicationHoursStart: "08:00",
    communicationHoursEnd: "17:00",
    whoCanMessageWhom: "ALL",
    maxAttachmentSizeMb: 5,
    messageRetentionDays: 365,
    autoCloseInactivityDays: 7,
    directSubjectTeacherContact: true
  });

  // Broadcast announcements state (existing features)
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState('ALL');
  const [broadcastPriority, setBroadcastPriority] = useState('NORMAL');
  const [broadcastPinned, setBroadcastPinned] = useState(false);

  // Common UI states
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Session check on mount
  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        setCurrentUser(sessionObj.user);
        loadDashboardResources(sessionObj.school.id, sessionObj.user);
      } catch (e) {
        setErrorMsg('Invalid session credentials.');
      }
    }
  }, []);

  // 2. Fetch all hub data based on role context
  const loadDashboardResources = async (schoolId: string, user: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Fetch Chats & Settings
      const chatRes = await fetch(`/api/communication?schoolId=${schoolId}`);
      const chatJson = await chatRes.json();
      if (chatRes.ok && chatJson.success) {
        setConversations(chatJson.data.conversations || []);
        setTemplates(chatJson.data.templates || []);
        if (chatJson.data.settings) setSettings(chatJson.data.settings);
      }

      // Fetch Meetings
      const meetRes = await fetch(`/api/communication/meetings?schoolId=${schoolId}`);
      const meetJson = await meetRes.json();
      if (meetRes.ok && meetJson.success) {
        setMeetings(meetJson.data || []);
      }

      // Fetch Broadcast Announcements (Inbox mode)
      const broadRes = await fetch(`/api/messages?schoolId=${schoolId}&userId=${user.id}&mode=inbox`);
      const broadJson = await broadRes.json();
      if (broadRes.ok && broadJson.success) {
        setBroadcasts(broadJson.data || []);
      }

      // If user is a Parent, load their wards and child teachers for composing messages
      if (user.role === 'PARENT') {
        let loadedFromApi = false;
        try {
          const parentRes = await fetch(`/api/parents?schoolId=${schoolId}&email=${user.email}`);
          const parentJson = await parentRes.json();
          if (parentRes.ok && parentJson.success && parentJson.data?.length > 0) {
            const parentObj = parentJson.data[0];
            const wards = parentObj.students || [];
            const formatted = wards.map((s: any) => ({
              id: s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              className: s.class?.name || '',
              armName: s.arm?.name || '',
              parent: parentObj
            }));
            setMyWards(formatted);
            
            if (formatted.length > 0) {
              setNewChatStudentId(formatted[0].id);
              setMeetingStudentId(formatted[0].id);
              fetchTeachersForStudent(schoolId, formatted[0].id);
            }
            loadedFromApi = true;
          }
        } catch (err) {
          console.error('Failed to load parent registry via API:', err);
        }

        // Fallback to local session user details if API request returns empty or fails
        if (!loadedFromApi && user.parent) {
          const wards = user.parent.students || [];
          const formatted = wards.map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            className: s.class?.name || '',
            armName: s.arm?.name || '',
            parent: user.parent
          }));
          setMyWards(formatted);
          
          if (formatted.length > 0) {
            setNewChatStudentId(formatted[0].id);
            setMeetingStudentId(formatted[0].id);
            fetchTeachersForStudent(schoolId, formatted[0].id);
          }
        }
      } else {
        // Load school students for teacher/admin to start chats
        const studentRes = await fetch(`/api/students?schoolId=${schoolId}`);
        const studentJson = await studentRes.json();
        if (studentRes.ok && studentJson.success) {
          const loadedStudents = studentJson.data || [];
          const formatted = loadedStudents.map((s: any) => ({
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            className: s.class?.name || '',
            armName: s.arm?.name || '',
            parent: s.parent
          }));
          setMyWards(formatted);
          
          if (formatted.length > 0) {
            setNewChatStudentId(formatted[0].id);
            setMeetingStudentId(formatted[0].id);
            const firstKid = formatted[0];
            if (firstKid.parent) {
              setAvailableTeachers([{
                id: firstKid.parent.id,
                firstName: firstKid.parent.firstName,
                lastName: firstKid.parent.lastName,
                label: 'Parent'
              }]);
              setNewChatTeacherId(firstKid.parent.id);
            }
          }
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to retrieve communication logs');
    } finally {
      setLoading(false);
    }
  };

  // Helper: load teachers overseeing a specific student's arm
  const fetchTeachersForStudent = async (schoolId: string, studentId: string) => {
    try {
      const res = await fetch(`/api/wellbeing?schoolId=${schoolId}&studentId=${studentId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const list = [];
        if (json.data.classTeacher) {
          list.push({ ...json.data.classTeacher, label: 'Class Teacher' });
        }
        // Add School Administrators and Super Administrators
        (json.data.schoolAdmins || []).forEach((adm: any) => {
          list.push({ ...adm, label: adm.role === 'SUPER_ADMIN' ? 'Platform Admin' : 'School Admin' });
        });
        setAvailableTeachers(list);
        if (list.length > 0) {
          setNewChatTeacherId(list[0].id);
          setMeetingTeacherId(list[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching teachers:', e);
    }
  };

  useEffect(() => {
    if (!newChatStudentId || !school || !currentUser) return;
    if (currentUser.role === 'PARENT') {
      fetchTeachersForStudent(school.id, newChatStudentId);
    } else {
      const kid = myWards.find((w: any) => w.id === newChatStudentId);
      if (kid && kid.parent) {
        setAvailableTeachers([{
          id: kid.parent.id,
          firstName: kid.parent.firstName,
          lastName: kid.parent.lastName,
          label: 'Parent'
        }]);
        setNewChatTeacherId(kid.parent.id);
      } else {
        setAvailableTeachers([]);
        setNewChatTeacherId('');
      }
    }
  }, [newChatStudentId, school, currentUser, myWards]);

  // Load chat messages when a conversation is clicked
  const handleSelectConversation = async (conv: ChatConversation) => {
    setSelectedConversation(conv);
    setActiveChatMessages([]);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/communication?schoolId=${school.id}&conversationId=${conv.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveChatMessages(json.data.messages || []);
        // Refresh conversations to update read badges
        const refreshRes = await fetch(`/api/communication?schoolId=${school.id}`);
        const refreshJson = await refreshRes.json();
        if (refreshRes.ok && refreshJson.success) {
          setConversations(refreshJson.data.conversations || []);
        }
      } else {
        throw new Error(json.error || 'Failed to load messages');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error fetching conversation thread');
    }
  };

  // Send reply message
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConversation || !school) return;

    setSending(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          conversationId: selectedConversation.id,
          messageBody: replyText.trim()
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to deliver message');
      
      setReplyText('');
      // Append to active message screen
      setActiveChatMessages(prev => [...prev, json.data]);
      
      // Update lastActivity locally on conversation list
      setConversations(prev => prev.map(c => c.id === selectedConversation.id ? { ...c, lastActivity: new Date().toISOString() } : c));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deliver message');
    } finally {
      setSending(false);
    }
  };

  // Create new conversation (Parent only)
  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatStudentId || !newChatTeacherId || !newChatBody.trim() || !school) return;

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          studentId: newChatStudentId,
          recipientId: newChatTeacherId,
          category: 'GENERAL',
          subject: 'Direct Chat',
          messageBody: newChatBody.trim()
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to start chat thread');

      setSuccessMsg('Chat thread successfully created!');
      setNewChatSubject('');
      setNewChatBody('');
      setShowNewChatModal(false);

      // Refresh chats list and select the new one
      const refreshRes = await fetch(`/api/communication?schoolId=${school.id}`);
      const refreshJson = await refreshRes.json();
      if (refreshRes.ok && refreshJson.success) {
        const chats: ChatConversation[] = refreshJson.data.conversations || [];
        setConversations(chats);
        // Find and select the new conversation
        const matched = chats.find(c => c.id === json.data.conversationId);
        if (matched) {
          handleSelectConversation(matched);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start conversation');
    } finally {
      setSending(false);
    }
  };

  // Submit Meeting Request (Parent only)
  const handleRequestMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingStudentId || !meetingTeacherId || !meetingType || !meetingReason.trim() || !meetingDate || !meetingTime || !school) return;

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/communication/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          studentId: meetingStudentId,
          teacherId: meetingTeacherId,
          type: meetingType,
          reason: meetingReason.trim(),
          preferredDate: meetingDate,
          preferredTime: meetingTime
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to request meeting');

      setSuccessMsg('Meeting appointment successfully requested!');
      setMeetingReason('');
      setMeetingDate('');
      setMeetingTime('');
      setShowMeetingModal(false);

      // Reload meetings list
      const meetRes = await fetch(`/api/communication/meetings?schoolId=${school.id}`);
      const meetJson = await meetRes.json();
      if (meetRes.ok && meetJson.success) {
        setMeetings(meetJson.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit appointment booking');
    } finally {
      setSending(false);
    }
  };

  // Meeting actions (Approve / Decline / Suggest another time)
  const handleMeetingAction = async (meetingId: string, status: string, statusReason?: string, suggestedDate?: string, suggestedTime?: string) => {
    if (!school) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/communication/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          meetingId,
          status,
          statusReason,
          suggestedDate,
          suggestedTime
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update meeting appointment');

      setSuccessMsg(`Meeting status successfully updated to ${status.toLowerCase()}`);
      
      // Reload meetings list
      const meetRes = await fetch(`/api/communication/meetings?schoolId=${school.id}`);
      const meetJson = await meetRes.json();
      if (meetRes.ok && meetJson.success) {
        setMeetings(meetJson.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update appointment status');
    }
  };

  // Close chat thread
  const handleCloseConversation = async (conversationId: string) => {
    if (!school) return;
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/communication', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          conversationId,
          status: 'CLOSED'
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to close conversation thread');

      setSuccessMsg('Conversation thread successfully closed');
      
      // Update local state conversation status
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, status: 'CLOSED' } : c)
      );
      if (selectedConversation && selectedConversation.id === conversationId) {
        setSelectedConversation({ ...selectedConversation, status: 'CLOSED' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to close conversation thread');
    }
  };

  // Save Settings (Admin only)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          action: 'SAVE_SETTINGS',
          ...settings
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save communication policies');

      setSuccessMsg('Communication policies updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update communication rules');
    } finally {
      setSending(false);
    }
  };

  // Submit Broadcast Announcement (Admin / Head Teacher only)
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim() || !school) return;

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          senderId: currentUser.id,
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          targetAudience: broadcastAudience,
          priority: broadcastPriority,
          isPinned: broadcastPinned,
          messageType: 'ANNOUNCEMENT'
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to dispatch announcement');

      setSuccessMsg('Announcement broadcasted successfully!');
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastPinned(false);

      // Reload announcements list
      const broadRes = await fetch(`/api/messages?schoolId=${school.id}&userId=${currentUser.id}&mode=inbox`);
      const broadJson = await broadRes.json();
      if (broadRes.ok && broadJson.success) {
        setBroadcasts(broadJson.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to broadcast announcement');
    } finally {
      setSending(false);
    }
  };

  // Filter conversations based on category and search query (any order matches)
  const filteredConversations = conversations.filter(c => {
    const matchesCategory = chatCategoryFilter === 'ALL' || c.category === chatCategoryFilter;
    const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) return matchesCategory;

    const studentFirst = c.student.firstName.toLowerCase();
    const studentLast = c.student.lastName.toLowerCase();
    const teacherFirst = c.teacher.firstName.toLowerCase();
    const teacherLast = c.teacher.lastName.toLowerCase();
    const parentFirst = c.parent.firstName.toLowerCase();
    const parentLast = c.parent.lastName.toLowerCase();
    const subjectLower = c.subject.toLowerCase();

    const matchesSearch = searchTerms.every(term => 
      studentFirst.includes(term) ||
      studentLast.includes(term) ||
      teacherFirst.includes(term) ||
      teacherLast.includes(term) ||
      parentFirst.includes(term) ||
      parentLast.includes(term) ||
      subjectLower.includes(term)
    );

    return matchesCategory && matchesSearch;
  });

  // Filter students based on search query in the Start Chat modal (any order matches)
  const filteredWards = myWards.filter(w => {
    const firstNameLower = w.firstName.toLowerCase();
    const lastNameLower = w.lastName.toLowerCase();
    const searchTerms = studentSearchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    
    return searchTerms.every(term => 
      firstNameLower.includes(term) || lastNameLower.includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* 1. Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">School Communication Hub</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Structured parent-teacher messaging logs, school announcements, and parent appointment planner.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-center">
          <button 
            onClick={() => {
              setActiveTab('chats');
              if (school) {
                fetch(`/api/communication?schoolId=${school.id}`)
                  .then(res => res.json())
                  .then(json => {
                    if (json.success) setConversations(json.data.conversations || []);
                  })
                  .catch(console.error);
              }
            }} 
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'chats' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Direct Messages
          </button>
          <button 
            onClick={() => {
              setActiveTab('broadcasts');
              if (school && currentUser) {
                fetch(`/api/messages?schoolId=${school.id}&userId=${currentUser.id}&mode=inbox`)
                  .then(res => res.json())
                  .then(json => {
                    if (json.success) setBroadcasts(json.data || []);
                  })
                  .catch(console.error);
              }
            }} 
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'broadcasts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            Announcements
          </button>
          <button 
            onClick={() => {
              setActiveTab('meetings');
              if (school) {
                fetch(`/api/communication/meetings?schoolId=${school.id}`)
                  .then(res => res.json())
                  .then(json => {
                    if (json.success) setMeetings(json.data || []);
                  })
                  .catch(console.error);
              }
            }} 
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'meetings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Meetings
          </button>
          {(currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'settings' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Alerts messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="h-[60vh] flex items-center justify-center">
            <div className="text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Assembling Hub logs...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ==================== TAB 1: DIRECT MESSAGES ==================== */}
            {activeTab === 'chats' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[75vh]">
                {/* Left Side: Conversations list (col 4) */}
                <div className="lg:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50 min-h-0">
                  <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-800">Conversations</h2>
                      {currentUser?.role !== 'STUDENT' && (
                        <button 
                          onClick={() => { setStudentSearchQuery(''); setShowNewChatModal(true); }} 
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Start Chat
                        </button>
                      )}
                    </div>
                    {/* Search and Filters */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* List Container */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filteredConversations.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No active conversations found matching constraints.
                      </div>
                    ) : (
                      filteredConversations.map((conv) => {
                        const isUnread = conv.messages.some(m => !m.isRead && m.senderId !== currentUser?.id);
                        const latestMsg = conv.messages[0];

                        const displayRole = conv.teacher.role === 'SCHOOL_ADMIN' ? 'admin' :
                                            conv.teacher.role === 'SUPER_ADMIN' ? 'developer' :
                                            conv.teacher.role === 'CLASS_TEACHER' ? 'class teacher' :
                                            conv.teacher.role === 'SUBJECT_TEACHER' ? 'subject teacher' :
                                            conv.teacher.role === 'HEAD_TEACHER' ? 'head teacher' : 'teacher';

                        const displayTitle = currentUser?.role === 'PARENT' 
                          ? `${conv.teacher.firstName} ${conv.teacher.lastName} (${displayRole})`
                          : `${conv.parent.firstName} ${conv.parent.lastName} (parent)`;
                        
                        const lastSnippet = latestMsg?.body || conv.subject;

                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1 hover:bg-slate-100/70 ${selectedConversation?.id === conv.id ? 'bg-indigo-50/50 border-l-2 border-indigo-600' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h3 className={`text-xs font-bold truncate flex-1 text-slate-800 ${isUnread ? 'text-slate-950 font-black font-extrabold' : ''}`}>
                                {displayTitle}
                              </h3>
                              <span className="text-[9px] font-medium text-slate-400 flex-shrink-0 mt-0.5">
                                {new Date(conv.lastActivity).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className={`text-[11px] truncate flex-1 ${isUnread ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                                {lastSnippet}
                              </p>
                              {isUnread && (
                                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0 flex items-center justify-center text-[7px] text-white font-bold animate-pulse" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Side: Message Thread (col 8) */}
                <div className="lg:col-span-8 flex flex-col h-full bg-white min-h-0">
                  {selectedConversation ? (
                    <>
                      {/* Active conversation Header */}
                      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/30">
                        <div>
                          {(() => {
                            const displayRole = selectedConversation.teacher.role === 'SCHOOL_ADMIN' ? 'admin' :
                                                selectedConversation.teacher.role === 'SUPER_ADMIN' ? 'developer' :
                                                selectedConversation.teacher.role === 'CLASS_TEACHER' ? 'class teacher' :
                                                selectedConversation.teacher.role === 'SUBJECT_TEACHER' ? 'subject teacher' :
                                                selectedConversation.teacher.role === 'HEAD_TEACHER' ? 'head teacher' : 'teacher';

                            const displayTitle = currentUser?.role === 'PARENT' 
                              ? `${selectedConversation.teacher.firstName} ${selectedConversation.teacher.lastName} (${displayRole})`
                              : `${selectedConversation.parent.firstName} ${selectedConversation.parent.lastName} (parent)`;

                            return (
                              <>
                                <h2 className="text-sm font-bold text-slate-900">{displayTitle}</h2>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  Focus: <span className="font-semibold text-slate-700">{selectedConversation.student.firstName} {selectedConversation.student.lastName}</span> ({selectedConversation.student.className} {selectedConversation.student.armName})
                                </p>
                              </>
                            );
                          })()}
                        </div>
                        {currentUser?.role !== 'PARENT' && selectedConversation.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleCloseConversation(selectedConversation.id)}
                            className="px-2.5 py-1 border border-slate-200 rounded text-[10px] font-semibold text-slate-650 hover:bg-slate-50 transition-all"
                          >
                            Close Conversation
                          </button>
                        )}
                      </div>

                      {/* Messages Thread Container */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/20">
                        {activeChatMessages.map((msg) => {
                          const isMe = msg.senderId === currentUser?.id;
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[70%] rounded-xl p-3 shadow-sm text-xs ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                                <div className="flex items-center justify-between gap-4 mb-1 text-[9px] opacity-75 font-semibold">
                                  <span>{msg.sender.firstName} ({msg.sender.role.replace('_', ' ')})</span>
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Thread Reply Input Form */}
                      {selectedConversation.status !== 'CLOSED' ? (
                        <form onSubmit={handleSendReply} className="p-3 border-t border-slate-200 flex gap-2 items-center bg-white">
                          {currentUser?.role !== 'PARENT' && (
                            <button
                              type="button"
                              onClick={() => setShowTemplatePicker(true)}
                              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-indigo-600 flex-shrink-0 transition-all"
                              title="Smart Message Templates"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                          )}
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type a message..."
                            disabled={sending}
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs bg-slate-50"
                          />
                          <button
                            type="submit"
                            disabled={sending || !replyText.trim()}
                            className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-all"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500 font-semibold italic">
                          This conversation thread has been resolved and closed.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/20">
                      <MessageSquare className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
                      <h3 className="text-sm font-bold text-slate-700">No Chat Selected</h3>
                      <p className="text-xs max-w-xs mt-1">Select a conversation thread from the roster panel to inspect the secure log or reply.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB 2: BROADCAST ANNOUNCEMENTS ==================== */}
            {activeTab === 'broadcasts' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Form to dispatch announcement (Admin/Teachers) */}
                {(currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HEAD_TEACHER') && (
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <Megaphone className="w-4 h-4 text-indigo-600" />
                      <h2 className="text-sm font-bold text-slate-900">Broadcast School Announcement</h2>
                    </div>

                    <form onSubmit={handleSendBroadcast} className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Announcement Title</label>
                        <input
                          type="text"
                          required
                          value={broadcastTitle}
                          onChange={(e) => setBroadcastTitle(e.target.value)}
                          placeholder="e.g. End of Term Examination Timetable"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Target Audience</label>
                          <select
                            value={broadcastAudience}
                            onChange={(e) => setBroadcastAudience(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none"
                          >
                            <option value="ALL">All (Everyone)</option>
                            <option value="PARENTS">Parents Only</option>
                            <option value="TEACHERS">Teachers Only</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Priority</label>
                          <select
                            value={broadcastPriority}
                            onChange={(e) => setBroadcastPriority(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none"
                          >
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High Priority</option>
                            <option value="URGENT">Urgent Alert</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Message Body</label>
                        <textarea
                          required
                          rows={6}
                          value={broadcastBody}
                          onChange={(e) => setBroadcastBody(e.target.value)}
                          placeholder="Write message details..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pin-check"
                          checked={broadcastPinned}
                          onChange={(e) => setBroadcastPinned(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="pin-check" className="text-xs font-semibold text-slate-500 cursor-pointer">
                          Pin this announcement to bulletin header
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={sending}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {sending ? 'Broadcasting...' : 'Broadcast Announcement Now'}
                      </button>
                    </form>
                  </div>
                )}

                {/* History feed of announcements */}
                <div className={`${(currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HEAD_TEACHER') ? 'lg:col-span-7' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-900">Announcements Feed</h2>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {broadcasts.length} Active
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {broadcasts.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        <Megaphone className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        No announcements broadcasted yet.
                      </div>
                    ) : (
                      broadcasts.map((broad) => (
                        <div key={broad.id} className={`p-4 border border-slate-150 rounded-xl hover:bg-slate-50/50 transition-all ${broad.isPinned ? 'border-l-4 border-l-amber-500' : ''}`}>
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-xs font-bold text-slate-900">{broad.title}</h3>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {broad.isPinned && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[9px] font-black tracking-wider uppercase">
                                  Pinned
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${broad.priority === 'URGENT' ? 'bg-red-100 text-red-700' : broad.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {broad.priority}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">{broad.body}</p>
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-400">
                            <span>Target: <span className="font-semibold text-slate-500">{broad.targetAudience}</span></span>
                            <span>{new Date(broad.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ==================== TAB 3: MEETING REQUESTS ==================== */}
            {activeTab === 'meetings' && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Meeting Planner & Appointments</h2>
                    <p className="text-slate-400 text-[11px] mt-0.5">Secure, structured scheduling slots between guardians and teachers.</p>
                  </div>
                  {currentUser?.role === 'PARENT' && (
                    <button 
                      onClick={() => setShowMeetingModal(true)} 
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Request Meeting
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {meetings.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No meetings requested or scheduled yet.
                    </div>
                  ) : (
                    meetings.map((meet) => (
                      <div key={meet.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/30 flex flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase">
                              {meet.type}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              meet.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                              meet.status === 'DECLINED' ? 'bg-red-100 text-red-700' :
                              meet.status === 'SUGGESTED' ? 'bg-amber-100 text-amber-700' :
                              'bg-indigo-50 text-indigo-700'
                            }`}>
                              {meet.status}
                            </span>
                          </div>

                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2">"{meet.reason}"</h3>
                          <div className="space-y-1 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                            <p>Ward: <span className="font-semibold text-slate-700">{meet.student.firstName} {meet.student.lastName}</span></p>
                            <p>Date: <span className="font-semibold text-slate-700">{meet.preferredDate}</span> at <span className="font-semibold text-slate-700">{meet.preferredTime}</span></p>
                            <p>
                              {currentUser?.role === 'PARENT' 
                                ? `${meet.teacher.role === 'SCHOOL_ADMIN' || meet.teacher.role === 'SUPER_ADMIN' ? 'Admin' : 'Teacher'}: ${meet.teacher.firstName} ${meet.teacher.lastName}` 
                                : `Parent: ${meet.parent.firstName} ${meet.parent.lastName}`
                              }
                            </p>
                          </div>
                        </div>

                        {/* Meeting suggestions notice */}
                        {meet.status === 'SUGGESTED' && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
                            {meet.teacher.role === 'SCHOOL_ADMIN' || meet.teacher.role === 'SUPER_ADMIN' ? 'Admin' : 'Teacher'} suggested: <strong>{meet.suggestedDate}</strong> at <strong>{meet.suggestedTime}</strong>
                          </div>
                        )}

                        {meet.statusReason && (
                          <div className={`p-2.5 rounded-lg text-[10px] border leading-normal ${
                            meet.status === 'APPROVED' 
                              ? 'bg-emerald-50/50 text-emerald-800 border-emerald-150' 
                              : 'bg-red-50/50 text-red-800 border-red-150'
                          }`}>
                            <span className="font-extrabold uppercase tracking-wider text-[9px] block mb-0.5">
                              {meet.status === 'APPROVED' ? '✅ Approval Note' : '❌ Rejection Reason'}
                            </span>
                            {meet.statusReason}
                          </div>
                        )}

                        {/* Action buttons (for teachers/admins on pending requests) */}
                        {currentUser?.role !== 'PARENT' && meet.status === 'PENDING' && (
                          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => {
                                setSelectedMeetingForAction({ id: meet.id, status: 'APPROVED' });
                                setActionReason('');
                              }}
                              className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMeetingForAction({ id: meet.id, status: 'DECLINED' });
                                setActionReason('');
                              }}
                              className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition-all"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB 4: COMMUNICATION SETTINGS ==================== */}
            {activeTab === 'settings' && (currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN') && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Communication & Privacy Policy Settings</h2>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Communication Hours Start</label>
                      <input
                        type="time"
                        value={settings.communicationHoursStart}
                        onChange={(e) => setSettings({ ...settings, communicationHoursStart: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Communication Hours End</label>
                      <input
                        type="time"
                        value={settings.communicationHoursEnd}
                        onChange={(e) => setSettings({ ...settings, communicationHoursEnd: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Who can message whom?</label>
                    <select
                      value={settings.whoCanMessageWhom}
                      onChange={(e) => setSettings({ ...settings, whoCanMessageWhom: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                    >
                      <option value="ALL">All Teachers & Subject Advisors</option>
                      <option value="CLASS_ONLY">Class Teacher Only</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Max Attachment Size (MB)</label>
                      <input
                        type="number"
                        value={settings.maxAttachmentSizeMb}
                        onChange={(e) => setSettings({ ...settings, maxAttachmentSizeMb: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Message Retention (Days)</label>
                      <input
                        type="number"
                        value={settings.messageRetentionDays}
                        onChange={(e) => setSettings({ ...settings, messageRetentionDays: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Auto-close Inactivity (Days)</label>
                      <input
                        type="number"
                        value={settings.autoCloseInactivityDays}
                        onChange={(e) => setSettings({ ...settings, autoCloseInactivityDays: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="subject-contact"
                      checked={settings.directSubjectTeacherContact}
                      onChange={(e) => setSettings({ ...settings, directSubjectTeacherContact: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="subject-contact" className="text-xs font-bold text-slate-500 cursor-pointer">
                      Allow parents to contact Subject Teachers directly
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {sending ? 'Saving Settings...' : 'Save Communication Policies'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================== MODAL: START DIRECT MESSAGING (Parent only) ==================== */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xl w-full max-w-md space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Start a Conversation</h3>
              <button 
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Child (Ward)</label>
                {currentUser?.role !== 'PARENT' && (
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => {
                      const query = e.target.value;
                      setStudentSearchQuery(query);
                      
                      // Auto-select first matched student in dropdown
                      const matched = myWards.find(w => 
                        `${w.firstName} ${w.lastName}`.toLowerCase().includes(query.toLowerCase())
                      );
                      if (matched) {
                        setNewChatStudentId(matched.id);
                      }
                    }}
                    placeholder="Type to search child name..."
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans font-medium"
                  />
                )}
                <select
                  value={newChatStudentId}
                  onChange={(e) => setNewChatStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                >
                  {filteredWards.map(w => (
                    <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.className} {w.armName})</option>
                  ))}
                </select>
                {filteredWards.length === 0 && (
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">No child matching search term found.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {currentUser?.role === 'PARENT' ? 'Select Teacher Recipient' : 'Select Parent Recipient'}
                </label>
                <select
                  value={newChatTeacherId}
                  onChange={(e) => setNewChatTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                >
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.label})</option>
                  ))}
                </select>
              </div>



              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Message Body</label>
                <textarea
                  required
                  rows={4}
                  value={newChatBody}
                  onChange={(e) => setNewChatBody(e.target.value)}
                  placeholder="Enter message detail..."
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {sending ? 'Starting Thread...' : 'Create Chat Thread'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: MEETING REQUEST (Parent only) ==================== */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xl w-full max-w-md space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Request a Meeting</h3>
              <button 
                onClick={() => setShowMeetingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRequestMeeting} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Child (Ward)</label>
                <select
                  value={meetingStudentId}
                  onChange={(e) => {
                    const studentId = e.target.value;
                    setMeetingStudentId(studentId);
                    if (school) {
                      fetchTeachersForStudent(school.id, studentId);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                >
                  {myWards.map(w => (
                    <option key={w.id} value={w.id}>{w.firstName} {w.lastName} ({w.className} {w.armName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Staff</label>
                <select
                  value={meetingTeacherId}
                  onChange={(e) => setMeetingTeacherId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                >
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.label})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Preferred Time</label>
                  <input
                    type="time"
                    required
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Reason for meeting</label>
                <textarea
                  required
                  rows={4}
                  value={meetingReason}
                  onChange={(e) => setMeetingReason(e.target.value)}
                  placeholder="e.g. Discussing Ward behaviour in class..."
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
              >
                {sending ? 'Requesting Appointment...' : 'Submit Meeting Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== SMART TEMPLATE PICKER OVERLAY (Teachers only) ==================== */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xl w-full max-w-md space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Select Smart Template</h3>
              <button 
                onClick={() => setShowTemplatePicker(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {[
                { title: 'Excellent improvement this week', content: 'Outstanding effort this week! Keep it up!' },
                { title: 'Please encourage daily reading', content: 'Please encourage daily reading at home to build confidence.' },
                { title: 'Homework has not been submitted', content: 'Dear Parent, this is a friendly notification that this week\'s homework remains unsubmitted. Please help ensure completion.' },
                { title: 'Outstanding classroom participation', content: 'Participated actively in all class discussions today. Excellent work!' },
                { title: 'Needs additional practice', content: 'Needs some additional practice on this topic. I recommend allocating extra study sessions at home.' },
                { title: 'Attendance has improved', content: 'Very pleased to note a significant improvement in school attendance this week.' }
              ].map((tmpl, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setReplyText(tmpl.content);
                    setShowTemplatePicker(false);
                  }}
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-all space-y-1"
                >
                  <h4 className="text-xs font-bold text-indigo-600">{tmpl.title}</h4>
                  <p className="text-[10px] text-slate-500">{tmpl.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MEETING STATUS REASON MODAL (Teachers/Admins) ==================== */}
      {selectedMeetingForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xl w-full max-w-md space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                {selectedMeetingForAction.status === 'APPROVED' ? 'Approve Meeting Slot' : 'Decline Meeting Slot'}
              </h3>
              <button 
                onClick={() => setSelectedMeetingForAction(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                {selectedMeetingForAction.status === 'APPROVED' 
                  ? 'Confirm meeting schedule. You can optionally add a brief note or confirmation instructions for the parent.'
                  : 'Please state the reason for rejecting or declining this meeting request. The parent will be notified.'
                }
              </p>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {selectedMeetingForAction.status === 'APPROVED' ? 'Approval Note (Optional)' : 'Decline Reason'}
                </label>
                <textarea
                  required={selectedMeetingForAction.status === 'DECLINED'}
                  rows={4}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={selectedMeetingForAction.status === 'APPROVED' 
                    ? "e.g. Approved. Please ask for the Principal's office upon arrival..." 
                    : "e.g. I am unavailable at this time due to teacher training. Please suggest another day..."
                  }
                  className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedMeetingForAction(null)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (selectedMeetingForAction.status === 'DECLINED' && !actionReason.trim()) {
                    alert('Please specify a rejection reason.');
                    return;
                  }
                  await handleMeetingAction(selectedMeetingForAction.id, selectedMeetingForAction.status, actionReason.trim());
                  setSelectedMeetingForAction(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all ${
                  selectedMeetingForAction.status === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {selectedMeetingForAction.status === 'APPROVED' ? 'Approval' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
