'use client';

import { useState, useEffect, use } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  Activity, Thermometer, Wind, AlertTriangle, CheckCircle, 
  Smartphone, Watch, Phone, Droplets, ThumbsUp, RefreshCw, CheckCircle2, Loader2, Pill, Clock, Settings2, Plus, X, Edit2, Trash2, AlertCircle, Sliders
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import axios from 'axios';

export default function SeniorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const seniorId = resolvedParams.id;

  // --- State Management ---
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MEDICATIONS' | 'LOGS' | 'SETTINGS'>('OVERVIEW');
  const [senior, setSenior] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  const [currentReadings, setCurrentReadings] = useState({ temp: '--', humidity: '--', gas: '--', airScore: '--', occupancy: false });
  const[lastMovement, setLastMovement] = useState<Date | null>(null);
  const[lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const[resolvingId, setResolvingId] = useState<string | null>(null);

  // Medication State
  const[medSchedules, setMedSchedules] = useState<any[]>([]);
  const [medLogs, setMedLogs] = useState<any[]>([]);
  const [isMedManageMode, setIsMedManageMode] = useState(false);
  const[showMedForm, setShowMedForm] = useState(false);
  const [isSavingMed, setIsSavingMed] = useState(false);
  const [medFormData, setMedFormData] = useState({ id: '', name: '', dosage: '', time: '09:00' });
  const [now, setNow] = useState(new Date());

  // Device State
  const [showAddDeviceForm, setShowAddDeviceForm] = useState(false);
  const [newDeviceSerial, setNewDeviceSerial] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<'POD' | 'WEARABLE'>('POD');
  const[addDeviceLoading, setAddDeviceLoading] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState('');

  // Threshold State
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [showThresholdForm, setShowThresholdForm] = useState(false);
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);
  const [thresholdFormData, setThresholdFormData] = useState({ id: '', metric: 'TEMPERATURE', min: '', max: '' });


  const [lastPresenceTime, setLastPresenceTime] = useState<Date | null>(null);

  // --- Data Fetching ---
  useEffect(() => {
    fetchData();

    // --- REALTIME SUBSCRIPTION ---
    // Listen for new environmental readings for this specific senior's devices
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'environmental_readings' 
        },
        (payload) => {
          // Check if the new reading belongs to one of our devices
          if (devices.some(d => d.id === payload.new.device_id)) {
            console.log("New reading received via Realtime!", payload.new);
            // Trigger a data refresh automatically
            fetchData(true); 
          }
        }
      )
      .subscribe();

    const interval = setInterval(() => setNow(new Date()), 60000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [seniorId, devices.length]); // Add devices to dependency so listener knows which IDs to watch

  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true); // Only show "Refreshing..." if manual
    try {
      const { data: userData } = await supabase.from('users').select('*').eq('id', seniorId).single();
      if (userData) setSenior(userData);

      const { data: deviceData } = await supabase.from('devices').select('*').eq('senior_id', seniorId);
      let podId = null; let wearableId = null;

      if (deviceData) {
        setDevices(deviceData);
        const pod = deviceData.find(d => d.type === 'POD');
        const wearable = deviceData.find(d => d.type === 'WEARABLE');
        if (pod) podId = pod.id;
        if (wearable) wearableId = wearable.id;
      }

      if (podId) {
        // Fetch latest readings for stats and chart
        const { data: readings } = await supabase.from('environmental_readings').select('*').eq('device_id', podId).order('recorded_at', { ascending: false }).limit(15);
        
        if (readings && readings.length > 0) {
          setCurrentReadings({ 
            temp: readings[0].temperature, 
            humidity: readings[0].humidity, 
            gas: readings[0].gas_resistance, 
            airScore: readings[0].air_quality_score,
            occupancy: readings[0].occupancy 
          });

          // Format for Chart (Include Humidity)
          const formatted = readings.reverse().map(r => ({
            time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temp: Number(r.temperature),
            hum: Number(r.humidity) // Added Humidity
          }));
          setChartData(formatted);
        }

        // NEW: Fetch the last time the room was actually occupied
        const { data: lastOcc } = await supabase
          .from('environmental_readings')
          .select('recorded_at')
          .eq('device_id', podId)
          .eq('occupancy', true)
          .order('recorded_at', { ascending: false })
          .limit(1);
        
        if (lastOcc && lastOcc.length > 0) {
          setLastPresenceTime(new Date(lastOcc[0].recorded_at));
        }
      }

      let activityEvents: any[] =[];
      if (wearableId) {
        const { data: moves } = await supabase.from('activity_events').select('*').eq('device_id', wearableId).order('recorded_at', { ascending: false }).limit(15);
        if (moves) {
          activityEvents = moves;
          const regularMoves = moves.filter(m => m.type === 'REGULAR_MOVEMENT');
          if (regularMoves.length > 0) setLastMovement(new Date(regularMoves[0].recorded_at));
        }
      }

      const { data: checkins } = await supabase.from('daily_checkins').select('*').eq('senior_id', seniorId).order('recorded_at', { ascending: false }).limit(5);
      if (checkins && checkins.length > 0) setLastCheckIn(new Date(checkins[0].recorded_at));

      const { data: alerts } = await supabase.from('alerts').select('*').eq('senior_id', seniorId).order('created_at', { ascending: false }).limit(15);

      // Fetch Medications
      const { data: schedData } = await supabase.from('medication_schedules').select('*').eq('senior_id', seniorId).order('time_of_day', { ascending: true });
      if (schedData) {
        setMedSchedules(schedData);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const { data: logData } = await supabase.from('medication_logs').select('*').in('schedule_id', schedData.map(s => s.id)).gte('logged_at', today.toISOString());
        if (logData) setMedLogs(logData);
      }

      // Fetch Personal Thresholds
      const { data: threshData } = await supabase.from('thresholds').select('*').eq('senior_id', seniorId);
      if (threshData) setThresholds(threshData);

      // Unified Logs
      const unifiedLogs: any[] =[];
      (alerts ||[]).forEach(a => unifiedLogs.push({
        id: `alert-${a.id}`, dbId: a.id, type: 'ALERT', status: a.status, timestamp: new Date(a.created_at),
        title: a.title, message: a.message, color: a.status === 'ACTIVE' ? 'bg-red-500' : 'bg-slate-400'
      }));
      (activityEvents ||[]).forEach(a => {
        if (a.type === 'FALL' || a.type === 'PANIC') return; 
        unifiedLogs.push({ id: `act-${a.id}`, type: 'EVENT', timestamp: new Date(a.recorded_at), title: 'Movement Detected', message: 'Normal activity recorded.', color: 'bg-blue-400' });
      });
      (checkins ||[]).forEach(c => unifiedLogs.push({
        id: `chk-${c.id}`, type: 'CHECKIN', timestamp: new Date(c.recorded_at), title: '✅ "I\'m OK" Check-in', message: 'Senior marked themselves as OK.', color: 'bg-emerald-500'
      }));

      unifiedLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setLogs(unifiedLogs);

    } catch (error) { console.error("Error fetching data:", error); } finally { if (!silent) setIsRefreshing(false); }
  };

  // --- Handlers ---
  const handleResolveAlert = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      await supabase.from('alerts').update({ status: 'RESOLVED', resolved_at: new Date().toISOString() }).eq('id', alertId);
      await fetchData(); 
    } catch (e) { alert("Failed to resolve alert"); } finally { setResolvingId(null); }
  };

  const handleUnlinkDevice = async (deviceId: string) => {
    if(!confirm("Are you sure you want to unlink this device?")) return;
    try { await axios.patch(`http://localhost:3000/users/devices/unassign/${deviceId}`); fetchData(); } catch (e) { alert("Failed to unlink device"); }
  };

  const handleDeleteSenior = async () => {
    const confirmName = prompt(`To confirm deletion, type: ${senior?.first_name}`);
    if (confirmName !== senior?.first_name) return;
    try { await axios.delete(`http://localhost:3000/users/senior/${seniorId}`); window.location.href = '/dashboard/seniors'; } catch (e) { alert("Failed to delete senior"); }
  };

  const handleAddDevice = async () => {
    setAddDeviceLoading(true); setAddDeviceError('');
    try {
      await axios.patch(`http://localhost:3000/users/assign-device/${seniorId}`, { serial: newDeviceSerial, type: newDeviceType });
      await fetchData(); setNewDeviceSerial(''); setNewDeviceType('POD'); setShowAddDeviceForm(false);
    } catch (err: any) { setAddDeviceError(err.response?.data?.message || 'Failed to link device.'); } finally { setAddDeviceLoading(false); }
  };

  // --- Medication Handlers ---
  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSavingMed(true);
    try {
      const timeFormatted = medFormData.time.length === 5 ? `${medFormData.time}:00` : medFormData.time;
      if (medFormData.id) {
        await supabase.from('medication_schedules').update({ medicine_name: medFormData.name, dosage: medFormData.dosage, time_of_day: timeFormatted }).eq('id', medFormData.id);
      } else {
        await supabase.from('medication_schedules').insert({ senior_id: seniorId, medicine_name: medFormData.name, dosage: medFormData.dosage, time_of_day: timeFormatted });
      }
      await fetchData(); setShowMedForm(false);
    } catch (err) { alert("Failed to save medication."); } finally { setIsSavingMed(false); }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm("Delete this medication?")) return;
    try { await supabase.from('medication_schedules').delete().eq('id', id); await fetchData(); } catch (error) { alert("Failed to delete."); }
  };

  const getMedicationState = (schedule: any) => {
    const isTaken = medLogs.some(log => log.schedule_id === schedule.id && log.status === 'TAKEN');
    if (isTaken) return 'TAKEN';
    const [hours, minutes] = schedule.time_of_day.split(':');
    const schedTime = new Date(now);
    schedTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const diffMins = (now.getTime() - schedTime.getTime()) / (1000 * 60);
    if (diffMins > 60) return 'MISSED';
    if (diffMins >= 0 && diffMins <= 60) return 'DUE_NOW';
    return 'UPCOMING';
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date(); date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  // --- Threshold Handlers ---
  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingThreshold(true);
    try {
      const minVal = thresholdFormData.min === '' ? null : parseFloat(thresholdFormData.min);
      const maxVal = thresholdFormData.max === '' ? null : parseFloat(thresholdFormData.max);

      if (minVal === null && maxVal === null) throw new Error("Provide at least a Min or Max value.");
      if (minVal !== null && maxVal !== null && minVal >= maxVal) throw new Error("Min must be less than Max.");

      const payload = { metric: thresholdFormData.metric, min_value: minVal, max_value: maxVal, senior_id: seniorId };

      if (thresholdFormData.id) {
        await supabase.from('thresholds').update(payload).eq('id', thresholdFormData.id);
      } else {
        // Check if personal override already exists for this metric
        const existing = thresholds.find(t => t.metric === thresholdFormData.metric);
        if (existing) throw new Error(`A personal override for ${thresholdFormData.metric} already exists.`);
        await supabase.from('thresholds').insert(payload);
      }
      await fetchData();
      setShowThresholdForm(false);
    } catch (err: any) {
      alert(err.message || "Failed to save threshold.");
    } finally {
      setIsSavingThreshold(false);
    }
  };

  const handleDeleteThreshold = async (id: string) => {
    if (!confirm("Remove this personal override? The system will revert to Global Admin rules.")) return;
    try {
      await supabase.from('thresholds').delete().eq('id', id);
      await fetchData();
    } catch (error) { alert("Failed to delete threshold."); }
  };

  if (!senior) return <div className="p-10 text-center text-slate-500">Loading Senior Data...</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{senior.first_name} {senior.last_name}</h1>
          <p className="text-slate-500">Status: Active Monitoring</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchData()} disabled={isRefreshing} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <a href={`tel:+1234567890`} className="px-4 py-2 bg-[#462775] text-white rounded-lg font-medium hover:bg-[#3a2060] flex items-center gap-2 transition-colors">
            <Phone className="h-4 w-4" /> Call {senior.first_name}
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-8 overflow-x-auto">
        {['OVERVIEW', 'MEDICATIONS', 'LOGS', 'SETTINGS'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-4 text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab ? 'text-[#462775] border-b-2 border-[#462775]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dynamic Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#462775]" /> Environment Trends (24h)
            </h3>
            
            <div className="h-[350px] w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">Waiting for Telemetry...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#462775" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#462775" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    
                    {/* Left Y-Axis for Temp */}
                    <YAxis yAxisId="left" orientation="left" domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{fill: '#462775', fontSize: 10}} />
                    
                    {/* Right Y-Axis for Humidity */}
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#3b82f6', fontSize: 10}} />
                    
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    
                    <Area yAxisId="left" type="monotone" dataKey="temp" name="Temp (°C)" stroke="#462775" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                    <Area yAxisId="right" type="monotone" dataKey="hum" name="Humidity (%)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHum)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs font-bold">
              <div className="flex items-center gap-2 text-[#462775]"><div className="w-3 h-3 bg-[#462775] rounded-full"></div> Temperature</div>
              <div className="flex items-center gap-2 text-[#3b82f6]"><div className="w-3 h-3 bg-[#3b82f6] rounded-full"></div> Humidity</div>
            </div>
          </div>

          {/* Comprehensive Side Stats */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">Current Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Thermometer className="h-4 w-4 text-orange-500" /> Temp</span>
                  <span className="font-bold text-slate-900">{currentReadings.temp}°C</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Droplets className="h-4 w-4 text-blue-500" /> Humidity</span>
                  <span className="font-bold text-slate-900">{currentReadings.humidity}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Wind className="h-4 w-4 text-teal-500" /> Air Quality
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      {Number(currentReadings.airScore).toFixed(0)}%
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {/* Convert 100000 to 100k */}
                      {Number(currentReadings.gas) >= 1000 
                        ? `${(Number(currentReadings.gas) / 1000).toFixed(1)} kΩ` 
                        : `${currentReadings.gas} Ω`}
                    </p>
                  </div>
                </div>
                <hr className="border-slate-200 my-2" />
                {/* Activity & Presence */}
<div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
    <Smartphone className="h-4 w-4 text-purple-500" /> Room Presence
  </span>
  <div className="text-right">
                    <span className={`font-bold text-[10px] px-2 py-1 rounded-md ${currentReadings.occupancy ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {currentReadings.occupancy ? 'PRESENT' : 'EMPTY'}
                    </span>
                    {/* Show last time someone was there if currently empty */}
                    {!currentReadings.occupancy && lastPresenceTime && (
                      <p className="text-[9px] text-slate-400 mt-1">Last: {lastPresenceTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
</div>

<div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
    <Watch className="h-4 w-4 text-blue-500" /> Wearable Activity
  </span>
  <span className="font-bold text-slate-900 text-xs text-right">
    {lastMovement ? lastMovement.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No movement'}
  </span>
</div>

<div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
  <span className="text-sm font-medium text-emerald-800 flex items-center gap-2">
    <ThumbsUp className="h-4 w-4" /> Daily Check-in
  </span>
  <span className="font-bold text-emerald-900 text-xs text-right">
    {lastCheckIn ? lastCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}
  </span>
</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MEDICATIONS */}
      {activeTab === 'MEDICATIONS' && (
        <div className="max-w-4xl space-y-6">
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Medication Adherence</h3>
              <p className="text-sm text-slate-500">Monitor and manage {senior.first_name}'s schedule.</p>
            </div>
            <button 
              onClick={() => { setIsMedManageMode(!isMedManageMode); setShowMedForm(false); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${isMedManageMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <Settings2 className="h-4 w-4" /> {isMedManageMode ? 'Done Managing' : 'Manage Schedule'}
            </button>
          </div>

          {/* Add/Edit Form */}
          {isMedManageMode && showMedForm && (
            <div className="bg-[#462775]/5 p-6 rounded-2xl border border-[#462775]/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#462775]">{medFormData.id ? 'Edit Medication' : 'Add New Medication'}</h3>
                <button onClick={() => setShowMedForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSaveMedication} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Medicine Name</label>
                  <input type="text" required value={medFormData.name} onChange={e => setMedFormData({...medFormData, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#462775] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dosage</label>
                  <input type="text" required value={medFormData.dosage} onChange={e => setMedFormData({...medFormData, dosage: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#462775] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time of Day</label>
                  <input type="time" required value={medFormData.time} onChange={e => setMedFormData({...medFormData, time: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-[#462775] outline-none" />
                </div>
                <div className="md:col-span-3 flex justify-end mt-2">
                  <button type="submit" disabled={isSavingMed} className="bg-[#462775] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#3a2060] disabled:opacity-70 flex items-center gap-2">
                    {isSavingMed ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isMedManageMode && !showMedForm && (
            <button onClick={() => { setMedFormData({ id: '', name: '', dosage: '', time: '09:00' }); setShowMedForm(true); }} className="w-full py-3 border-2 border-dashed border-[#462775]/30 rounded-2xl text-[#462775] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#462775]/5 transition-colors">
              <Plus className="h-5 w-5" /> Add New Medication
            </button>
          )}

          {/* List */}
          <div className="space-y-3">
            {medSchedules.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">No medications scheduled.</div>
            ) : (
              medSchedules.map(sched => {
                const state = getMedicationState(sched);
                
                let statusBadge = <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Upcoming</span>;
                if (state === 'TAKEN') statusBadge = <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Taken</span>;
                if (state === 'DUE_NOW') statusBadge = <span className="text-xs font-bold text-[#462775] bg-purple-100 px-2 py-1 rounded-md animate-pulse">Due Now</span>;
                if (state === 'MISSED') statusBadge = <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-md flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Missed</span>;

                return (
                  <div key={sched.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400"><Pill className="h-5 w-5" /></div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-slate-900">{sched.medicine_name}</h4>
                          {!isMedManageMode && statusBadge}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTime(sched.time_of_day)} • {sched.dosage}
                        </p>
                      </div>
                    </div>
                    
                    {isMedManageMode && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setMedFormData({ id: sched.id, name: sched.medicine_name, dosage: sched.dosage, time: sched.time_of_day.substring(0, 5) }); setShowMedForm(true); }} className="p-2 text-slate-400 hover:text-[#462775] hover:bg-purple-50 rounded-lg transition-colors"><Edit2 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteMedication(sched.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: LOGS */}
      {activeTab === 'LOGS' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 max-w-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Activity & Alert Timeline</h3>
            <span className="text-xs text-slate-500">Showing latest events</span>
          </div>
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No recent activity recorded.</p>
            ) : (
              logs.map(log => {
                const isActiveAlert = log.type === 'ALERT' && log.status === 'ACTIVE';
                return (
                  <div key={log.id} className={`flex gap-4 items-start p-4 rounded-xl border transition-colors ${isActiveAlert ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${log.color} shadow-sm`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm font-bold ${isActiveAlert ? 'text-red-900' : 'text-slate-900'}`}>{log.title} {log.type === 'ALERT' && log.status === 'RESOLVED' && '(Resolved)'}</p>
                        <p className="text-xs font-bold text-slate-400">{log.timestamp.toLocaleString()}</p>
                      </div>
                      <p className={`text-sm mt-1 ${isActiveAlert ? 'text-red-700' : 'text-slate-600'}`}>{log.message}</p>
                      {isActiveAlert && (
                        <button onClick={() => handleResolveAlert(log.dbId)} disabled={resolvingId === log.dbId} className="mt-3 flex items-center gap-1 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                          {resolvingId === log.dbId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Mark as Resolved
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="max-w-2xl space-y-8">
          
          {/* Personal Thresholds (NEW) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Sliders className="h-5 w-5 text-[#462775]" /> Personal Safety Thresholds</h3>
                <p className="text-xs text-slate-500 mt-1">These rules override the Global Admin settings for {senior.first_name}.</p>
              </div>
            </div>

            <div className="space-y-3">
              {thresholds.length === 0 ? (
                <p className="text-slate-500 text-sm">No personal overrides set. Using Global rules.</p>
              ) : (
                thresholds.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div>
                      <p className="font-bold text-sm text-[#462775]">{t.metric.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-600">
                        Min: <span className="font-bold">{t.min_value ?? 'None'}</span> | Max: <span className="font-bold">{t.max_value ?? 'None'}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setThresholdFormData({ id: t.id, metric: t.metric, min: t.min_value ?? '', max: t.max_value ?? '' }); setShowThresholdForm(true); }} className="text-slate-400 hover:text-[#462775]"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteThreshold(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!showThresholdForm ? (
              <button onClick={() => { setThresholdFormData({ id: '', metric: 'TEMPERATURE', min: '', max: '' }); setShowThresholdForm(true); }} className="mt-4 text-[#462775] text-sm font-bold flex items-center gap-1 hover:underline">
                + Add Personal Override
              </button>
            ) : (
              <form onSubmit={handleSaveThreshold} className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900">{thresholdFormData.id ? 'Edit Override' : 'New Override'}</h4>
                <div className="grid grid-cols-3 gap-3">
                  <select value={thresholdFormData.metric} onChange={e => setThresholdFormData({...thresholdFormData, metric: e.target.value})} disabled={!!thresholdFormData.id} className="border border-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#462775] outline-none bg-white disabled:opacity-60">
                    <option value="TEMPERATURE">Temperature</option>
                    <option value="CO2">CO2 Level</option>
                    <option value="INACTIVITY_HOURS">Inactivity Hours</option>
                  </select>
                  <input type="number" step="0.1" placeholder="Min Value" value={thresholdFormData.min} onChange={e => setThresholdFormData({...thresholdFormData, min: e.target.value})} className="border border-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#462775] outline-none" />
                  <input type="number" step="0.1" placeholder="Max Value" value={thresholdFormData.max} onChange={e => setThresholdFormData({...thresholdFormData, max: e.target.value})} className="border border-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#462775] outline-none" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="submit" disabled={isSavingThreshold} className="bg-[#462775] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#3a2060] disabled:opacity-70 flex items-center justify-center min-w-[100px]">
                    {isSavingThreshold ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </button>
                  <button type="button" onClick={() => setShowThresholdForm(false)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">Cancel</button>
                </div>
              </form>
            )}
          </div>

          {/* Device Management */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Connected Devices</h3>
            <div className="space-y-3">
              {devices.length === 0 ? (
                <p className="text-slate-500 text-sm">No devices connected.</p>
              ) : (
                devices.map(device => (
                  <div key={device.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      {device.type === 'POD' ? <Smartphone className="h-5 w-5 text-[#462775]" /> : <Watch className="h-5 w-5 text-[#462775]" />}
                      <div>
                        <p className="font-bold text-sm text-slate-900">{device.type === 'POD' ? 'WellNest Pod' : 'Wearable'}</p>
                        <p className="text-xs text-slate-500">S/N: {device.serial_number}</p>
                      </div>
                    </div>
                    <button onClick={() => handleUnlinkDevice(device.id)} className="text-red-500 text-xs font-bold hover:underline">Unlink</button>
                  </div>
                ))
              )}
            </div>
            {!showAddDeviceForm ? (
              <button onClick={() => setShowAddDeviceForm(true)} className="mt-4 text-[#462775] text-sm font-bold flex items-center gap-1 hover:underline">+ Link another device</button>
            ) : (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-900">Link New Device</h4>
                <div className="flex gap-3">
                  <input type="text" placeholder="Device Serial (e.g. WEAR-2001)" value={newDeviceSerial} onChange={(e) => setNewDeviceSerial(e.target.value)} className="flex-1 border border-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#462775] outline-none" />
                  <select value={newDeviceType} onChange={(e) => setNewDeviceType(e.target.value as 'POD' | 'WEARABLE')} className="border border-slate-200 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-[#462775] outline-none bg-white">
                    <option value="POD">Pod</option>
                    <option value="WEARABLE">Wearable</option>
                  </select>
                </div>
                {addDeviceError && <p className="text-red-500 text-xs font-medium">{addDeviceError}</p>}
                <div className="flex gap-2 mt-2">
                  <button onClick={handleAddDevice} disabled={!newDeviceSerial || addDeviceLoading} className="bg-[#462775] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#3a2060] disabled:opacity-70 flex items-center justify-center min-w-[100px]">
                    {addDeviceLoading ? 'Adding...' : 'Add Device'}
                  </button>
                  <button onClick={() => { setShowAddDeviceForm(false); setAddDeviceError(''); }} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
            <h3 className="font-bold text-red-900 mb-2">Danger Zone</h3>
            <p className="text-red-700 text-sm mb-4">Removing a senior will permanently delete their account, history, and unlink all devices. This action cannot be undone.</p>
            <button onClick={handleDeleteSenior} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">Delete Senior Account</button>
          </div>
        </div>
      )}
    </div>
  );
}