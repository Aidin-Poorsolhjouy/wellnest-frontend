// components/SeniorDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ThumbsUp, AlertOctagon, Thermometer, Wind, MessageSquare, Loader2, Pill, AlertCircle, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function SeniorDashboard({ userId, firstName }: { userId: string, firstName: string }) {
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const[isPanicking, setIsPanicking] = useState(false);
  const [environment, setEnvironment] = useState({ temp: '--', gas: '--' });
  
  // Medication State
  const [medStatus, setMedStatus] = useState<{ type: 'MISSED' | 'DUE' | 'UPCOMING' | 'ALL_DONE' | 'LOADING', count?: number, nextName?: string, nextTime?: string }>({ type: 'LOADING' });

  useEffect(() => {
    fetchSeniorData();
    
    // Refresh every minute to keep medication status accurate
    const interval = setInterval(fetchSeniorData, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchSeniorData = async () => {
    // 1. Check Check-in Status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: checkins } = await supabase.from('daily_checkins').select('*').eq('senior_id', userId).gte('recorded_at', today.toISOString()).limit(1);
    if (checkins && checkins.length > 0) setHasCheckedIn(true);

    // 2. Fetch Environment
    const { data: device } = await supabase.from('devices').select('id').eq('senior_id', userId).eq('type', 'POD').single();
    if (device) {
      const { data: readings } = await supabase.from('environmental_readings').select('temperature, air_quality_score').eq('device_id', device.id).order('recorded_at', { ascending: false }).limit(1).single();
        if (readings) setEnvironment({ temp: readings.temperature.toString(), gas: Number(readings.air_quality_score).toFixed(0) });
    }

    // 3. Calculate Medication Status
    calculateMedicationStatus(userId);
  };

  const calculateMedicationStatus = async (uid: string) => {
    // Fetch Schedules
    const { data: schedules } = await supabase.from('medication_schedules').select('*').eq('senior_id', uid).order('time_of_day', { ascending: true });
    if (!schedules || schedules.length === 0) return setMedStatus({ type: 'ALL_DONE' }); // Or 'NO_MEDS'

    // Fetch Logs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: logs } = await supabase.from('medication_logs').select('*').gte('logged_at', today.toISOString());
    const takenIds = (logs || []).map(l => l.schedule_id);

    const now = new Date();
    let missedCount = 0;
    let dueCount = 0;
    let nextUp = null;

    for (const sched of schedules) {
      if (takenIds.includes(sched.id)) continue; // Already taken

      const [hours, minutes] = sched.time_of_day.split(':');
      const schedTime = new Date();
      schedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const diffMins = (now.getTime() - schedTime.getTime()) / (1000 * 60);

      if (diffMins > 30) {
        missedCount++;
      } else if (diffMins >= 0 && diffMins <= 30) {
        dueCount++;
      } else {
        // It's in the future. Is it the closest one?
        if (!nextUp) nextUp = { name: sched.medicine_name, time: schedTime };
      }
    }

    // Determine Priority
    if (missedCount > 0) {
      setMedStatus({ type: 'MISSED', count: missedCount });
    } else if (dueCount > 0) {
      setMedStatus({ type: 'DUE', count: dueCount });
    } else if (nextUp) {
      setMedStatus({ 
        type: 'UPCOMING', 
        nextName: (nextUp as any).name, 
        nextTime: (nextUp as any).time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) 
      });
    } else {
      setMedStatus({ type: 'ALL_DONE' });
    }
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await supabase.from('daily_checkins').insert({ senior_id: userId });
      setHasCheckedIn(true);
    } catch (error) { alert("Failed to check in."); } finally { setIsCheckingIn(false); }
  };

  const handlePanic = async () => {
    if (!confirm("Are you sure you need emergency help?")) return;
    setIsPanicking(true);
    try {
      await supabase.from('alerts').insert({ senior_id: userId, title: '🆘 EMERGENCY: Software Panic Button', message: `${firstName} pressed the emergency button on their dashboard.`, status: 'ACTIVE' });
      alert("Help is on the way.");
    } catch (error) { alert("Failed to send alert."); } finally { setIsPanicking(false); }
  };

  // --- Helper to render the Med Card ---
  const renderMedCard = () => {
    if (medStatus.type === 'LOADING') return <div className="h-24 bg-slate-100 rounded-3xl animate-pulse" />;

    if (medStatus.type === 'MISSED') {
      return (
        <Link href="/dashboard/medications" className="block bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex items-center justify-between hover:bg-red-100 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center text-red-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900">Medication Missed!</h3>
              <p className="text-red-700">You have {medStatus.count} overdue medication(s).</p>
            </div>
          </div>
          <div className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm group-hover:scale-105 transition-transform">
            Take Now
          </div>
        </Link>
      );
    }

    if (medStatus.type === 'DUE') {
      return (
        <Link href="/dashboard/medications" className="block bg-white border-2 border-[#462775] p-6 rounded-3xl flex items-center justify-between hover:bg-purple-50 transition-colors group shadow-md ring-4 ring-purple-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#462775] rounded-full flex items-center justify-center text-white animate-pulse">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#462775]">Due Now</h3>
              <p className="text-slate-600">It's time to take {medStatus.count} medication(s).</p>
            </div>
          </div>
          <div className="bg-[#462775] text-white px-4 py-2 rounded-xl font-bold text-sm group-hover:scale-105 transition-transform">
            View
          </div>
        </Link>
      );
    }

    if (medStatus.type === 'UPCOMING') {
      return (
        <Link href="/dashboard/medications" className="block bg-white border border-slate-200 p-6 rounded-3xl flex items-center justify-between hover:border-[#462775] transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Next: {medStatus.nextName}</h3>
              <p className="text-slate-500">Scheduled for {medStatus.nextTime}</p>
            </div>
          </div>
          <ChevronRight className="text-slate-300 group-hover:text-[#462775]" />
        </Link>
      );
    }

    // All Done
    return (
      <Link href="/dashboard/medications" className="block bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center justify-between hover:bg-emerald-100 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-900">All Done!</h3>
            <p className="text-emerald-700">You've taken all your medications for today.</p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2">Hello, {firstName}</h1>
        <p className="text-xl text-slate-500">How are you feeling today?</p>
      </div>

      {/* The Big "I'm OK" Button */}
      <button
        onClick={handleCheckIn}
        disabled={hasCheckedIn || isCheckingIn}
        className={`w-full h-48 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-lg ${
          hasCheckedIn 
            ? 'bg-slate-100 border-4 border-slate-200 text-slate-400 cursor-not-allowed' 
            : 'bg-emerald-500 hover:bg-emerald-600 border-b-8 border-emerald-700 text-white active:border-b-0 active:translate-y-2'
        }`}
      >
        {isCheckingIn ? (
          <Loader2 className="h-16 w-16 animate-spin" />
        ) : (
          <>
            <ThumbsUp className="h-16 w-16" />
            <span className="text-3xl font-black tracking-wide">
              {hasCheckedIn ? "You're checked in for today!" : "I'm OK!"}
            </span>
          </>
        )}
      </button>

      {/* The Panic Button */}
      <button
        onClick={handlePanic}
        disabled={isPanicking}
        className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white p-6 rounded-3xl shadow-lg flex items-center justify-center gap-4 transition-colors border-b-8 border-red-800 active:border-b-0 active:translate-y-2"
      >
        {isPanicking ? <Loader2 className="h-10 w-10 animate-spin" /> : <AlertOctagon className="h-10 w-10" />}
        <span className="text-2xl font-black tracking-wide">EMERGENCY HELP</span>
      </button>

      {/* Medication Status Card (Dynamic) */}
      {renderMedCard()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Room Status */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">My Room</h3>
          <div className="flex justify-around">
            <div className="text-center">
              <Thermometer className="h-8 w-8 text-[#462775] mx-auto mb-2" />
              <p className="text-3xl font-black text-slate-900">{environment.temp}°</p>
              <p className="text-sm font-bold text-slate-500">Temp</p>
            </div>
            <div className="text-center">
              <Wind className="h-8 w-8 text-[#462775] mx-auto mb-2" />
              <p className="text-3xl font-black text-slate-900">{environment.gas}%</p>
              <p className="text-sm font-bold text-slate-500">Air Quality</p>
            </div>
          </div>
        </div>

        {/* Messages Link */}
        <Link href="/dashboard/chat" className="bg-[#462775] hover:bg-[#3a2060] text-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center transition-colors">
          <MessageSquare className="h-12 w-12 mb-3" />
          <span className="text-xl font-bold">Messages</span>
          <span className="text-purple-200 text-sm mt-1">Talk to your caregiver</span>
        </Link>
      </div>

      
    </div>
  );
}
