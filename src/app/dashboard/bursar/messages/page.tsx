'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  MessageSquare, Send, CheckCircle2, AlertCircle, Users, 
  RefreshCw, Bell, Inbox, Megaphone, Clock, ArrowLeft, 
  Check, Filter, Search, Plus, Sparkles, LogOut
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
    class?: { name: string };
    arm?: { name: string };
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
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function BursarMessagesHub() {
  const [school, setSchool] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'chats' | 'broadcast'>('chats');
  
  // DM states
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Broadcast states
  const [broadcastTitle, setBroadcastTitle] = useState('IMPORTANT: School Fees Payment Notice');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  
  // Stats
  const [owingCount, setOwingCount] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChatMessages]);

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        setCurrentUser(sessionObj.user);
      } catch (e) {
        setErrorMsg('Failed to parse user session.');
      }
    }
  }, []);

  useEffect(() => {
    if (school && currentUser) {
      fetchConversations();
      fetchOwingStats();
    }
  }, [school, currentUser]);

  // Poll for messages in the open chat conversation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (selectedConversation) {
      timer = setInterval(() => {
        refreshActiveConversation(selectedConversation.id);
      }, 4000);
    }
    return () => clearInterval(timer);
  }, [selectedConversation]);

  const fetchOwingStats = async () => {
    try {
      const res = await fetch(`/api/bursar/reports`);
      const json = await res.json();
      if (res.ok && json.success) {
        setOwingCount(json.data.kpis.studentsOwing || 0);
        setOutstandingAmount(json.data.kpis.outstandingFees || 0);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/communication?schoolId=${school.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        // Filter conversations to only show FEES category or chats involving the Bursar
        const list = (json.data.conversations || []).filter((c: any) => 
          c.category === 'FEES' || c.teacherId === currentUser.id
        );
        setConversations(list);
      } else {
        setErrorMsg(json.error || 'Failed to retrieve conversations.');
      }
    } catch (e) {
      setErrorMsg('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/communication?schoolId=${school.id}&conversationId=${convId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveChatMessages(json.data.messages || []);
      }
    } catch (e) {
      console.error('Error polling conversation:', e);
    }
  };

  const handleSelectConversation = async (conv: ChatConversation) => {
    setSelectedConversation(conv);
    setActiveChatMessages(conv.messages || []);
    setReplyText('');
    
    // Trigger read sync
    try {
      await fetch(`/api/communication?schoolId=${school.id}&conversationId=${conv.id}`);
    } catch (e) {
      console.error('Read receipts sync error:', e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConversation) return;

    const textToSend = replyText.trim();
    setReplyText('');

    try {
      const res = await fetch('/api/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          conversationId: selectedConversation.id,
          body: textToSend
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveChatMessages([...activeChatMessages, json.data]);
        // update main conversations list activity
        setConversations(prev => 
          prev.map(c => c.id === selectedConversation.id ? { ...c, lastActivity: new Date().toISOString() } : c)
              .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
        );
      } else {
        setErrorMsg(json.error || 'Failed to dispatch message.');
      }
    } catch (e) {
      setErrorMsg('Network error dispatching chat reply.');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      setErrorMsg('Please specify both a subject title and message content.');
      return;
    }

    if (!confirm(`Are you sure you want to broadcast this notice to all parents of the ${owingCount} owing students? This will publish a school announcement and send individual DMs to their chats.`)) {
      return;
    }

    setBroadcasting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/bursar/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcast: true,
          title: broadcastTitle.trim(),
          content: broadcastContent.trim()
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Announcement posted and DMs sent successfully!');
        setBroadcastContent('');
        fetchConversations(); // Reload chat list to display newly generated direct message conversations
      } else {
        setErrorMsg(json.error || 'Failed to dispatch broadcast reminders.');
      }
    } catch (e) {
      setErrorMsg('Network error sending broadcast request.');
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const parentName = `${c.parent.firstName} ${c.parent.lastName}`.toLowerCase();
    const studentName = `${c.student.firstName} ${c.student.lastName}`.toLowerCase();
    const matchQuery = searchQuery.toLowerCase();
    return parentName.includes(matchQuery) || studentName.includes(matchQuery) || c.subject.toLowerCase().includes(matchQuery);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      
      {/* Welcome Greetings Header */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">FINANCIAL MESSAGING</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            Bursar <span className="text-emerald-500 serif-italic font-normal">Communication Hub</span>
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Manage billing inquiries, payment DMs, and broadcasting announcements to outstanding parents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => { setActiveTab('chats'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'chats' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Messages</span>
          </button>
          <button
            onClick={() => { setActiveTab('broadcast'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'broadcast' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Broadcast Notice</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {activeTab === 'chats' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm min-h-[580px]">
          
          {/* Left panel: Conversations List */}
          <div className="lg:col-span-4 border-r border-slate-100 flex flex-col h-full min-h-[580px]">
            <div className="p-4 border-b border-slate-100 space-y-3.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] p-2 space-y-1.5">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Syncing threads...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="text-center text-xs text-slate-400 font-semibold italic py-12">No active parent chats found.</p>
              ) : (
                filteredConversations.map((c) => {
                  const lastMessage = c.messages?.[c.messages.length - 1]?.body || 'No messages yet';
                  const isSelected = selectedConversation?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectConversation(c)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-50 border-slate-200 shadow-sm' 
                          : 'border-transparent hover:bg-slate-50/50 hover:border-slate-100'
                      }`}
                    >
                      <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center font-bold text-emerald-700 text-xs">
                        {c.parent.firstName[0]}{c.parent.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="text-xs font-black text-slate-800 truncate">
                            {c.parent.firstName} {c.parent.lastName}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-semibold">
                            {new Date(c.lastActivity).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
                          Ward: {c.student.firstName} {c.student.lastName} ({c.student.class?.name || 'Class'})
                        </p>
                        <p className="text-[11px] text-slate-500 truncate italic">
                          "{lastMessage}"
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active Chat Thread */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-[580px] bg-slate-50/50">
            {selectedConversation ? (
              <div className="flex flex-col h-full flex-1">
                {/* Chat header */}
                <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-700">
                      {selectedConversation.parent.firstName[0]}{selectedConversation.parent.lastName[0]}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800">
                        {selectedConversation.parent.firstName} {selectedConversation.parent.lastName}
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        Topic: {selectedConversation.subject}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-lg">
                    {selectedConversation.category}
                  </span>
                </div>

                {/* Messages feed */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[380px]">
                  {activeChatMessages.map((m) => {
                    const isMe = m.senderId === currentUser?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-fadeIn`}
                      >
                        <div className={`p-3.5 max-w-[80%] rounded-2xl text-xs font-medium leading-relaxed ${
                          isMe 
                            ? 'bg-emerald-600 text-white rounded-br-none shadow-sm' 
                            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none shadow-sm'
                        }`}>
                          <p>{m.body}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 px-1 font-bold">
                          <span>{m.sender.firstName} ({m.sender.role})</span>
                          <span>•</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendMessage} className="bg-white p-4 border-t border-slate-100 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your reply here..."
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
                <MessageSquare className="w-12 h-12 text-slate-200" />
                <p className="text-xs font-semibold italic">Select a conversation thread from the left panel to reply.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Info stats */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Target Audience Summary</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Owing Parents</span>
                    <span className="text-lg font-black text-slate-800 mt-1 block">{owingCount} parents</span>
                  </div>
                  <Users className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Outstanding Fees</span>
                    <span className="text-lg font-black text-slate-800 mt-1 block">₦{outstandingAmount.toLocaleString()}</span>
                  </div>
                  <Bell className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-[10px] leading-relaxed font-bold">
                <p>
                  📢 Broadcasting triggers a public Announcement card visible to all guardians on their home portals, and automatically creates/appends a private chat message to each parent detailing their ward's exact owing amount.
                </p>
              </div>
            </div>
          </div>

          {/* Right panel: Broadcast Composer Form */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSendBroadcast} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Compose Outstanding Fees Broadcast</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Announcement Title / Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IMPORTANT: Outstanding School Fees Reminder"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Announcement Content / Chat Message Body</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Write details of the reminder. Explain deadlines, payment instructions via Flutterwave, or bank transfer reconciliation requirements..."
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-sans leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={broadcasting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{broadcasting ? 'Broadcasting...' : 'Publish & Send DM Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
