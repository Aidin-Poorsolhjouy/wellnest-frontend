// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, BookOpen, Plus, User, AlertTriangle, CheckCircle2, Clock, Sliders, Server } from 'lucide-react';
import Link from 'next/link';
import SeniorDashboard from '@/components/SeniorDashboard';

type JournalEntry = {
  id: string;
  note: string;
  created_at: string;
  senior: { first_name: string; last_name: string };
  author: { first_name: string; last_name: string };
};

export default function CaregiverDashboard() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const[isLoading, setIsLoading] = useState(true);

  // Caregiver Specific State
  const[seniors, setSeniors] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [newNote, setNewNote] = useState('');
  const[selectedSeniorId, setSelectedSeniorId] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  },[]);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    
    if (profile) {
      setUserRole(profile.role);
      setUserData(profile);

      if (profile.role === 'CAREGIVER') {
        // 1. Fetch Assigned Seniors
        const { data: relations } = await supabase.from('caregiver_senior').select('senior_id').eq('caregiver_id', user.id);
        if (relations && relations.length > 0) {
          const seniorIds = relations.map(r => r.senior_id);
          
          // Fetch Seniors with their active alerts count
          const { data: users } = await supabase.from('users').select('*').in('id', seniorIds);
          
          const seniorsWithAlerts = await Promise.all((users ||[]).map(async (s) => {
            const { count } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('senior_id', s.id).eq('status', 'ACTIVE');
            return { ...s, activeAlerts: count || 0 };
          }));
          
          setSeniors(seniorsWithAlerts);
          if (seniorsWithAlerts.length > 0) setSelectedSeniorId(seniorsWithAlerts[0].id);

          // 2. Fetch Journal Entries (Joining author and senior names)
          const { data: journalData } = await supabase
            .from('caregiver_journal')
            .select(`
              id, note, created_at,
              senior:users!caregiver_journal_senior_id_fkey(first_name, last_name),
              author:users!caregiver_journal_author_id_fkey(first_name, last_name)
            `)
            .in('senior_id', seniorIds)
            .order('created_at', { ascending: false })
            .limit(20);

          if (journalData) setJournalEntries(journalData as any);
        }
      }
    }
    setIsLoading(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedSeniorId || !userData) return;
    
    setIsSubmittingNote(true);
    try {
      const { error } = await supabase.from('caregiver_journal').insert({
        senior_id: selectedSeniorId,
        author_id: userData.id,
        note: newNote.trim()
      });

      if (error) throw error;
      
      setNewNote('');
      await fetchDashboardData(); // Refresh feed
    } catch (error) {
      alert("Failed to add note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-[#462775]" /></div>;

  // --- ROUTING LOGIC ---
  // if (userRole === 'SENIOR') {
  //   // If a senior navigates to /dashboard, redirect them to their specific component
  //   // (We built this in the previous step, but since we overwrote the file, we just redirect them to their Home)
  //   window.location.href = '/dashboard/my-health'; 
  //   return null;
  // }

  if (userRole === 'SENIOR') {
    return <SeniorDashboard userId={userData.id} firstName={userData.first_name} />;
  }

  if (userRole === 'ADMIN') {
    return <AdminDashboard userData={userData} />;
  }

  if (userRole === 'CAREGIVER') {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Caregiver Command Center</h1>
          <p className="text-lg text-slate-500">Welcome back, {userData.first_name}. Here is your daily overview.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Care Circle Overview */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-[#462775]" /> My Care Circle
              </h2>
              
              <div className="space-y-3">
                {seniors.length === 0 ? (
                  <p className="text-sm text-slate-500">No seniors assigned yet.</p>
                ) : (
                  seniors.map(senior => (
                    <Link key={senior.id} href={`/dashboard/seniors/${senior.id}`} className="block">
                      <div className={`p-4 rounded-2xl border transition-all hover:shadow-md ${
                        senior.activeAlerts > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100 hover:border-[#462775]'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">{senior.first_name} {senior.last_name}</span>
                          {senior.activeAlerts > 0 ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                              <AlertTriangle className="h-3 w-3" /> {senior.activeAlerts} Alerts
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="h-3 w-3" /> All Clear
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Caregiver Journal */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#462775]" /> Caregiver Journal
              </h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Shared Logbook</span>
            </div>

            {/* Journal Feed */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6">
              {journalEntries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <BookOpen className="h-12 w-12 opacity-20" />
                  <p>No journal entries yet. Start the logbook below.</p>
                </div>
              ) : (
                journalEntries.map(entry => (
                  <div key={entry.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#462775] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {entry.author?.first_name?.[0] || '?'}
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {entry.author?.first_name} {entry.author?.last_name}
                        </span>
                        <span className="text-xs text-slate-400">wrote about</span>
                        <span className="text-sm font-bold text-[#462775]">
                          {entry.senior?.first_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed pl-8">
                      {entry.note}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Input */}
            <form onSubmit={handleAddNote} className="mt-auto bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log note for:</label>
                  <select 
                    value={selectedSeniorId} 
                    onChange={(e) => setSelectedSeniorId(e.target.value)}
                    className="bg-white border border-slate-200 text-sm rounded-lg px-2 py-1 font-bold text-[#462775] outline-none focus:ring-2 focus:ring-[#462775]"
                  >
                    {seniors.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., Mom seemed tired today after her walk..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#462775] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newNote.trim() || isSubmittingNote}
                    className="bg-[#462775] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#3a2060] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmittingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add Note</>}
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>
      </div>
    );
  }

  return <div>Unauthorized Role</div>;
}


// --- ADMIN DASHBOARD COMPONENT ---
function AdminDashboard({ userData }: { userData: any }) {
    const [stats, setStats] = useState({ seniors: 0, caregivers: 0, devices: 0, activeAlerts: 0 });
    const [isLoading, setIsLoading] = useState(true);
  
    useEffect(() => {
      const fetchAdminStats = async () => {
        // Fetch counts in parallel for speed
        const [seniorsRes, caregiversRes, devicesRes, alertsRes] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'SENIOR'),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'CAREGIVER'),
          supabase.from('devices').select('*', { count: 'exact', head: true }),
          supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE')
        ]);
  
        setStats({
          seniors: seniorsRes.count || 0,
          caregivers: caregiversRes.count || 0,
          devices: devicesRes.count || 0,
          activeAlerts: alertsRes.count || 0
        });
        setIsLoading(false);
      };
      fetchAdminStats();
    },[]);
  
    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#462775]" /></div>;
  
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">System Overview</h1>
          <p className="text-lg text-slate-500">Welcome, {userData.first_name}. Here is the current status of the WellNest platform.</p>
        </div>
  
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><User className="h-7 w-7" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500">Total Seniors</p>
              <p className="text-3xl font-black text-slate-900">{stats.seniors}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-50 text-[#462775] rounded-2xl flex items-center justify-center"><User className="h-7 w-7" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500">Caregivers</p>
              <p className="text-3xl font-black text-slate-900">{stats.caregivers}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><Server className="h-7 w-7" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500">Devices in System</p>
              <p className="text-3xl font-black text-slate-900">{stats.devices}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center"><AlertTriangle className="h-7 w-7" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500">Active Alerts</p>
              <p className="text-3xl font-black text-slate-900">{stats.activeAlerts}</p>
            </div>
          </div>
        </div>
  
        {/* Quick Actions & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6">System Health</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-bold text-slate-700">Database Connection</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">Operational</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-bold text-slate-700">IoT Telemetry Engine</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">Operational</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-bold text-slate-700">Real-Time WebSockets</span>
                </div>
                <span className="text-sm font-bold text-emerald-600">Operational</span>
              </div>
            </div>
          </div>
  
          <div className="bg-[#462775] p-8 rounded-3xl shadow-sm text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
            <h2 className="text-2xl font-bold mb-2 relative z-10">Admin Quick Actions</h2>
            <p className="text-purple-200 mb-8 relative z-10">Manage the platform infrastructure.</p>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <Link href="/dashboard/admin/devices" className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-colors border border-white/10 flex flex-col items-center text-center gap-2">
                <Server className="h-6 w-6" />
                <span className="font-bold text-sm">Add Devices</span>
              </Link>
              <Link href="/dashboard/admin/thresholds" className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl transition-colors border border-white/10 flex flex-col items-center text-center gap-2">
                <Sliders className="h-6 w-6" />
                <span className="font-bold text-sm">Set Thresholds</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
