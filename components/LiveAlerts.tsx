// components/LiveAlerts.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, X } from 'lucide-react';

type Alert = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export default function LiveAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Subscribe to the 'alerts' table in Supabase
    const channel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          console.log('New alert received!', payload.new);
          setAlerts((current) => [payload.new as Alert, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-lg flex items-start justify-between animate-in slide-in-from-right-5"
        >
          <div className="flex gap-3">
            <AlertTriangle className="text-red-500 h-6 w-6 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-bold text-sm">{alert.title}</h3>
              <p className="text-red-700 text-xs mt-1">{alert.message}</p>
              <span className="text-red-400 text-[10px] mt-2 block">
                {new Date(alert.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
          <button
            onClick={() => setAlerts((current) => current.filter((a) => a.id !== alert.id))}
            className="text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}