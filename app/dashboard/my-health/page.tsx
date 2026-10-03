// app/dashboard/my-health/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Thermometer, Wind, Droplets, Smartphone, Watch, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MyHealthPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentReadings, setCurrentReadings] = useState({ 
  temp: '--', 
  humidity: '--', 
  gas: '--' 
});
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    const fetchMyData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Devices
      const { data: deviceData } = await supabase.from('devices').select('*').eq('senior_id', user.id);
      if (deviceData) {
        setDevices(deviceData);
        const pod = deviceData.find(d => d.type === 'POD');
        
        if (pod) {
          const { data: readings } = await supabase
            .from('environmental_readings')
            .select('*')
            .eq('device_id', pod.id)
            .order('recorded_at', { ascending: false })
            .limit(10);

          if (readings && readings.length > 0) {
            setCurrentReadings({ temp: readings[0].temperature, humidity: readings[0].humidity, gas: readings[0].air_quality_score });
            const formatted = readings.reverse().map(r => ({
              time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              temp: Number(r.temperature)
            }));
            setChartData(formatted);
          }
        }
      }
      setIsLoading(false);
    };

    fetchMyData();
  },[]);

  if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[#462775]" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Health & Environment</h1>
        <p className="text-slate-500">A transparent view of your home's data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-[#462775]" /> Room Temperature (Last 24h)
          </h3>
          <div className="h-[300px] w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#462775" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#462775" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="temp" stroke="#462775" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Side Stats */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">Current Readings</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Thermometer className="h-5 w-5 text-orange-500" /> Temp</span>
                <span className="font-bold text-slate-900 text-lg">{currentReadings.temp}°C</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Droplets className="h-5 w-5 text-blue-500" /> Humidity</span>
                <span className="font-bold text-slate-900 text-lg">{currentReadings.humidity}%</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Wind className="h-5 w-5 text-teal-500" /> Air Quality
                </span>
                <span className="font-bold text-slate-900 text-lg">{Number(currentReadings.gas).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-4">My Devices</h3>
            <div className="space-y-3">
              {devices.length === 0 ? (
                <p className="text-slate-500 text-sm">No devices connected.</p>
              ) : (
                devices.map(device => (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    {device.type === 'POD' ? <Smartphone className="h-6 w-6 text-[#462775]" /> : <Watch className="h-6 w-6 text-[#462775]" />}
                    <div>
                      <p className="font-bold text-sm text-slate-900">{device.type === 'POD' ? 'WellNest Pod' : 'Wearable'}</p>
                      <p className="text-xs text-emerald-600 font-bold">Online & Active</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
