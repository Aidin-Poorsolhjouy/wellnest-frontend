// app/dashboard/seniors/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { User, Thermometer, Wind, ChevronRight, Plus, Loader2, AlertTriangle } from 'lucide-react';

export default function MySeniorsPage() {
  const[seniors, setSeniors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeniors();
  },[]);

  const fetchSeniors = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: relations } = await supabase.from('caregiver_senior').select('senior_id').eq('caregiver_id', user.id);

      if (relations && relations.length > 0) {
        const seniorIds = relations.map(r => r.senior_id);
        const { data: users } = await supabase.from('users').select('*').in('id', seniorIds);

        const seniorsWithData = await Promise.all((users ||[]).map(async (senior) => {
          // 1. Fetch Device & Readings
          const { data: device } = await supabase.from('devices').select('id').eq('senior_id', senior.id).eq('type', 'POD').limit(1).single();
          let latestReading = null;
          if (device) {
             const { data: readings } = await supabase.from('environmental_readings').select('*').eq('device_id', device.id).order('recorded_at', { ascending: false }).limit(1);
             if (readings && readings.length > 0) latestReading = readings[0];
          }

          // 2. Fetch ACTIVE Alerts Count (The Notification Badge)
          const { count: activeAlerts } = await supabase
            .from('alerts')
            .select('*', { count: 'exact', head: true })
            .eq('senior_id', senior.id)
            .eq('status', 'ACTIVE');

          return { ...senior, reading: latestReading, activeAlerts: activeAlerts || 0 };
        }));

        setSeniors(seniorsWithData);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#462775]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Seniors</h1>
          <p className="text-slate-500">Overview of your care circle.</p>
        </div>
        <Link href="/dashboard/seniors/add">
          <button className="bg-[#462775] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#3a2060] transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Senior
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seniors.map((senior) => (
          <SeniorCard key={senior.id} data={senior} />
        ))}
      </div>
    </div>
  );
}

function SeniorCard({ data }: any) {
  const reading = data.reading || {};
  const temp = reading.temperature;
  
  // Card is critical if temp is high OR if there are unread alerts
  const hasActiveAlerts = data.activeAlerts > 0;
  const isCritical = temp > 30 || hasActiveAlerts;
  
  const borderColor = isCritical ? 'border-red-500 ring-1 ring-red-500 bg-red-50' : 'border-slate-200 bg-white';

  return (
    <Link href={`/dashboard/seniors/${data.id}`}>
      <div className={`rounded-2xl p-6 shadow-sm border ${borderColor} hover:shadow-md transition-all cursor-pointer group relative`}>
        
        {/* Notification Badge */}
        {hasActiveAlerts && (
          <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
            <AlertTriangle className="h-3 w-3" /> {data.activeAlerts} Action Required
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${hasActiveAlerts ? 'bg-red-200 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
              {data.first_name[0]}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-[#462775] transition-colors">
                {data.first_name} {data.last_name}
              </h3>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className={`w-2 h-2 rounded-full ${hasActiveAlerts ? 'bg-red-500' : 'bg-emerald-500'}`} />
                {hasActiveAlerts ? 'Needs Attention' : 'Active'}
              </div>
            </div>
          </div>
          <ChevronRight className={`group-hover:text-[#462775] ${hasActiveAlerts ? 'text-red-400' : 'text-slate-300'}`} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/60 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Thermometer className="h-4 w-4" /> <span className="text-xs font-bold">Temp</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-bold ${temp > 30 ? 'text-red-600' : 'text-slate-900'}`}>{temp ? temp.toFixed(1) : '--'}°</span>
              <span className="text-xs text-slate-400">C</span>
            </div>
          </div>
          <div className="bg-white/60 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Wind className="h-4 w-4" /> <span className="text-xs font-bold">Air Quality</span>
            </div>
            <div className="flex items-baseline gap-1">
              {/* Show percentage instead of ppm */}
              <span className="text-lg font-bold text-slate-900">
                {data.reading?.air_quality_score ? `${Number(data.reading.air_quality_score).toFixed(0)}%` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// // app/dashboard/seniors/page.tsx
// 'use client';

// import { useState, useEffect } from 'react';
// import Link from 'next/link';
// import { supabase } from '@/lib/supabase';
// import { User, Thermometer, Wind, Clock, ChevronRight, Plus, Loader2 } from 'lucide-react';

// export default function MySeniorsPage() {
//   const [seniors, setSeniors] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchSeniors();
//   }, []);

//   const fetchSeniors = async () => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) return;

//       // 1. Get IDs of seniors assigned to this caregiver
//       const { data: relations } = await supabase
//         .from('caregiver_senior')
//         .select('senior_id')
//         .eq('caregiver_id', user.id);

//       if (relations && relations.length > 0) {
//         const seniorIds = relations.map(r => r.senior_id);

//         // 2. Fetch Senior Details + Their Devices + Latest Readings
//         // Note: In a large app, we'd use a Supabase View or Join. 
//         // For MVP, we fetch users and then their device data.
//         const { data: users } = await supabase
//           .from('users')
//           .select('*')
//           .in('id', seniorIds);

//         // 3. Fetch latest device data for each senior
//         const seniorsWithData = await Promise.all((users || []).map(async (senior) => {
//           const { data: device } = await supabase
//             .from('devices')
//             .select('id, environmental_readings(temperature, co2, recorded_at)')
//             .eq('senior_id', senior.id)
//             .eq('type', 'POD')
//             .limit(1)
//             .single();

//           // Get the very last reading if it exists
//           // (Supabase returns array for one-to-many, we sort by date desc in query usually, 
//           // but here we just grab the latest if available)
//           let latestReading = null;
//           if (device) {
//              const { data: readings } = await supabase
//                .from('environmental_readings')
//                .select('*')
//                .eq('device_id', device.id)
//                .order('recorded_at', { ascending: false })
//                .limit(1);
//              if (readings && readings.length > 0) latestReading = readings[0];
//           }

//           return {
//             ...senior,
//             device: device,
//             reading: latestReading
//           };
//         }));

//         setSeniors(seniorsWithData);
//       }
//     } catch (error) {
//       console.error('Error fetching seniors:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#462775]" /></div>;

//   return (
//     <div className="space-y-6">
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-2xl font-bold text-slate-900">My Seniors</h1>
//           <p className="text-slate-500">Overview of your care circle.</p>
//         </div>
//         <Link href="/dashboard/seniors/add">
//           <button className="bg-[#462775] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#3a2060] transition-colors flex items-center gap-2">
//             <Plus className="h-4 w-4" /> Add Senior
//           </button>
//         </Link>
//       </div>

//       {seniors.length === 0 ? (
//         <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
//           <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
//           <h3 className="text-lg font-medium text-slate-900">No seniors added yet</h3>
//           <p className="text-slate-500 mb-6">Add a senior profile to start monitoring.</p>
//           <Link href="/dashboard/seniors/add">
//             <button className="text-[#462775] font-bold hover:underline">Add your first senior</button>
//           </Link>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {seniors.map((senior) => (
//             <SeniorCard key={senior.id} data={senior} />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// function SeniorCard({ data }: any) {
//   const reading = data.reading || {};
//   const temp = reading.temperature;
//   const co2 = reading.co2;
  
//   // Simple logic: If temp > 30, it's critical
//   const isCritical = temp > 30;
//   const borderColor = isCritical ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200';

//   return (
//     <Link href={`/dashboard/seniors/${data.id}`}>
//       <div className={`bg-white rounded-2xl p-6 shadow-sm border ${borderColor} hover:shadow-md transition-all cursor-pointer group`}>
//         <div className="flex justify-between items-start mb-6">
//           <div className="flex items-center gap-4">
//             <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xl">
//               {data.first_name[0]}
//             </div>
//             <div>
//               <h3 className="font-bold text-slate-900 group-hover:text-[#462775] transition-colors">
//                 {data.first_name} {data.last_name}
//               </h3>
//               <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
//                 <div className="w-2 h-2 rounded-full bg-emerald-500" />
//                 Active
//               </div>
//             </div>
//           </div>
//           <ChevronRight className="text-slate-300 group-hover:text-[#462775]" />
//         </div>

//         <div className="grid grid-cols-2 gap-4">
//           <div className="bg-slate-50 p-3 rounded-xl">
//             <div className="flex items-center gap-2 text-slate-500 mb-1">
//               <Thermometer className="h-4 w-4" />
//               <span className="text-xs font-bold">Temp</span>
//             </div>
//             <div className="flex items-baseline gap-1">
//               <span className={`text-lg font-bold ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>
//                 {temp ? temp.toFixed(1) : '--'}°
//               </span>
//               <span className="text-xs text-slate-400">C</span>
//             </div>
//           </div>

//           <div className="bg-slate-50 p-3 rounded-xl">
//             <div className="flex items-center gap-2 text-slate-500 mb-1">
//               <Wind className="h-4 w-4" />
//               <span className="text-xs font-bold">Air</span>
//             </div>
//             <div className="flex items-baseline gap-1">
//               <span className="text-lg font-bold text-slate-900">{co2 || '--'}</span>
//               <span className="text-xs text-slate-400">ppm</span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </Link>
//   );
// }
