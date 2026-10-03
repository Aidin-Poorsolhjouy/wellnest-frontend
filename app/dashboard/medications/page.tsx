// app/dashboard/medications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Pill, CheckCircle2, Clock, Loader2, Plus, Edit2, Trash2, Settings2, X, AlertCircle } from 'lucide-react';

type Schedule = {
  id: string;
  medicine_name: string;
  dosage: string;
  time_of_day: string;
};

type Log = {
  schedule_id: string;
  status: string;
  logged_at: string;
};

export default function SeniorMedicationsPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const[isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // FIX 1: Safe timer that forces re-renders without corrupting data
  const [now, setNow] = useState(new Date());

  // --- Management State ---
  const[isManageMode, setIsManageMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', dosage: '', time: '09:00' });

  useEffect(() => {
    fetchMedications();
    
    // Update the 'now' state every minute to recalculate Due/Missed statuses safely
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  },[]);

  const fetchMedications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: schedData } = await supabase.from('medication_schedules').select('*').eq('senior_id', user.id).order('time_of_day', { ascending: true });
    if (schedData) setSchedules(schedData);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: logData } = await supabase.from('medication_logs').select('*').gte('logged_at', today.toISOString());
    if (logData) setLogs(logData);
    
    setIsLoading(false);
  };

  const handleTakeMedication = async (scheduleId: string) => {
    setProcessingId(scheduleId);
    try {
      const { error } = await supabase.from('medication_logs').insert({ schedule_id: scheduleId, status: 'TAKEN' });
      if (error) throw error;
      setLogs([...logs, { schedule_id: scheduleId, status: 'TAKEN', logged_at: new Date().toISOString() }]);
    } catch (error) {
      alert("Failed to log medication.");
    } finally {
      setProcessingId(null);
    }
  };

  // --- Management Actions ---
  const handleOpenAddForm = () => { setFormData({ id: '', name: '', dosage: '', time: '09:00' }); setFormError(''); setShowForm(true); };
  const handleOpenEditForm = (sched: Schedule) => { setFormData({ id: sched.id, name: sched.medicine_name, dosage: sched.dosage, time: sched.time_of_day.substring(0, 5) }); setFormError(''); setShowForm(true); };
  
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;
    setProcessingId(id);
    try {
      await supabase.from('medication_schedules').delete().eq('id', id);
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (error) { alert("Failed to delete medication."); } finally { setProcessingId(null); }
  };

  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSaving(true); setFormError('');
    try {
      const timeFormatted = formData.time.length === 5 ? `${formData.time}:00` : formData.time;
      if (formData.id) {
        await supabase.from('medication_schedules').update({ medicine_name: formData.name, dosage: formData.dosage, time_of_day: timeFormatted }).eq('id', formData.id);
      } else {
        await supabase.from('medication_schedules').insert({ senior_id: userId, medicine_name: formData.name, dosage: formData.dosage, time_of_day: timeFormatted });
      }
      await fetchMedications();
      setShowForm(false);
    } catch (err: any) { setFormError(err.message || "Failed to save medication."); } finally { setIsSaving(false); }
  };

  // --- Time & State Logic ---
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  // FIX 2: Cleaned up logic to accurately determine the state
  const getMedicationState = (schedule: Schedule) => {
    const isTaken = logs.some(log => log.schedule_id === schedule.id && log.status === 'TAKEN');
    if (isTaken) return 'TAKEN';

    const [hours, minutes] = schedule.time_of_day.split(':');
    const schedTime = new Date(now); // Use the safe 'now' state
    schedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Difference in minutes between current time and scheduled time
    const diffMins = (now.getTime() - schedTime.getTime()) / (1000 * 60);

    if (diffMins > 30) return 'MISSED'; // More than 1 hour late
    if (diffMins >= 0 && diffMins <= 30) return 'DUE_NOW'; // Within the 1 hour window
    return 'UPCOMING'; // In the future
  };

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#462775]" /></div>;

  const totalMeds = schedules.length;
  const takenMeds = logs.filter(l => l.status === 'TAKEN').length;
  const progressPercentage = totalMeds === 0 ? 100 : Math.round((takenMeds / totalMeds) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header & Progress */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Good {getGreeting()}</h1>
          <p className="text-lg text-slate-500">Here is your medication schedule for today.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => { setIsManageMode(!isManageMode); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors ${
              isManageMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Settings2 className="h-5 w-5" />
            {isManageMode ? 'Done Managing' : 'Manage'}
          </button>

          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-200" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#462775] transition-all duration-1000 ease-out" strokeDasharray={`${progressPercentage}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute text-sm font-bold text-slate-900">{takenMeds}/{totalMeds}</span>
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-slate-900">Daily Progress</p>
              <p className="text-sm text-slate-500">{progressPercentage}% Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {isManageMode && showForm && (
        <div className="bg-[#462775]/5 p-6 rounded-3xl border border-[#462775]/20 animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-[#462775]">{formData.id ? 'Edit Medication' : 'Add New Medication'}</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
          </div>
          {formError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{formError}</div>}
          <form onSubmit={handleSaveMedication} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Medicine Name</label>
              <input type="text" required placeholder="e.g. Aspirin" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Dosage</label>
              <input type="text" required placeholder="e.g. 1 Pill (81mg)" value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Time of Day</label>
              <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none" />
            </div>
            <div className="md:col-span-3 flex justify-end mt-2">
              <button type="submit" disabled={isSaving} className="bg-[#462775] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#3a2060] disabled:opacity-70 flex items-center gap-2">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Medication'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isManageMode && !showForm && (
        <button onClick={handleOpenAddForm} className="w-full py-4 border-2 border-dashed border-[#462775]/30 rounded-3xl text-[#462775] font-bold flex items-center justify-center gap-2 hover:bg-[#462775]/5 transition-colors">
          <Plus className="h-6 w-6" /> Add New Medication
        </button>
      )}

      {/* Medication List */}
      <div className="space-y-4">
        {schedules.length === 0 && !isManageMode ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <Pill className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No medications scheduled</h3>
            <p className="text-slate-500 mt-2">Click "Manage" at the top to add your first medication.</p>
          </div>
        ) : (
          schedules.map((schedule) => {
            const state = getMedicationState(schedule);
            const isProcessing = processingId === schedule.id;
            
            // Dynamic Styling based on State
            let cardStyle = 'bg-white border-slate-200 shadow-sm';
            let iconStyle = 'bg-purple-50 text-[#462775]';
            let timeStyle = 'text-slate-500';
            let titleStyle = 'text-slate-900';
            let badge = null;

            if (state === 'TAKEN') {
              cardStyle = 'bg-emerald-50 border-emerald-200';
              iconStyle = 'bg-emerald-200 text-emerald-700';
              timeStyle = 'text-emerald-600';
              titleStyle = 'text-emerald-900 line-through opacity-70';
            } else if (state === 'DUE_NOW') {
              cardStyle = 'bg-white border-[#462775] shadow-md ring-1 ring-[#462775]';
              badge = <span className="bg-[#462775] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Due Now</span>;
            } else if (state === 'MISSED') {
              cardStyle = 'bg-red-50 border-red-300 shadow-sm';
              iconStyle = 'bg-red-200 text-red-700';
              timeStyle = 'text-red-600 font-bold';
              titleStyle = 'text-red-900';
              badge = <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Overdue</span>;
            }

            return (
              <div key={schedule.id} className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden ${cardStyle}`}>
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${iconStyle}`}>
                    {state === 'TAKEN' ? <CheckCircle2 className="h-8 w-8" /> : <Pill className="h-8 w-8" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className={`h-4 w-4 ${state === 'TAKEN' ? 'text-emerald-600' : state === 'MISSED' ? 'text-red-500' : 'text-slate-400'}`} />
                      <span className={`font-bold ${timeStyle}`}>
                        {formatTime(schedule.time_of_day)}
                      </span>
                      {/* FIX 2: Only render the badge, removed the old conflicting isDueNow logic */}
                      {!isManageMode && badge}
                    </div>
                    <h3 className={`text-2xl font-bold ${titleStyle}`}>
                      {schedule.medicine_name}
                    </h3>
                    <p className={`text-lg ${state === 'TAKEN' ? 'text-emerald-700 opacity-70' : state === 'MISSED' ? 'text-red-700' : 'text-slate-600'}`}>
                      Take: {schedule.dosage}
                    </p>
                  </div>
                </div>

                {isManageMode ? (
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleOpenEditForm(schedule)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-bold flex items-center gap-2">
                      <Edit2 className="h-5 w-5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(schedule.id)} disabled={isProcessing} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-bold flex items-center gap-2 disabled:opacity-50">
                      {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Trash2 className="h-5 w-5" /> Delete</>}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleTakeMedication(schedule.id)}
                    disabled={state === 'TAKEN' || isProcessing}
                    className={`py-4 px-8 rounded-2xl font-bold text-lg transition-all flex items-center justify-center min-w-[200px] ${
                      state === 'TAKEN' 
                        ? 'bg-emerald-200 text-emerald-800 cursor-not-allowed' 
                        : state === 'MISSED'
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl active:scale-95'
                          : 'bg-[#462775] hover:bg-[#3a2060] text-white shadow-lg hover:shadow-xl active:scale-95'
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : state === 'TAKEN' ? (
                      <><CheckCircle2 className="h-6 w-6 mr-2" /> Taken</>
                    ) : state === 'MISSED' ? (
                      'Take Late'
                    ) : (
                      'Mark as Taken'
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
