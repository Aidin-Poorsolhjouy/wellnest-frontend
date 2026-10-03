// app/dashboard/admin/devices/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Server, Smartphone, Watch, Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type Device = {
  id: string;
  serial_number: string;
  type: 'POD' | 'WEARABLE';
  battery_level: number;
  senior_id: string | null;
  senior?: { first_name: string; last_name: string } | null;
};

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add Device State
  const[showAddForm, setShowAddForm] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newType, setNewType] = useState<'POD' | 'WEARABLE'>('POD');
  const [isAdding, setIsAdding] = useState(false);
  const[addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    fetchDevices();
  },[]);

  const fetchDevices = async () => {
    setIsLoading(true);
    // Fetch devices and join with the users table to get the assigned senior's name
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        senior:users(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (data) setDevices(data as any);
    setIsLoading(false);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerial.trim()) return;
    
    setIsAdding(true);
    setAddError('');
    setAddSuccess(false);

    try {
      const { error } = await supabase.from('devices').insert({
        serial_number: newSerial.trim().toUpperCase(),
        type: newType,
        battery_level: 100 // Default for new devices
      });

      if (error) {
        if (error.code === '23505') throw new Error('A device with this serial number already exists.');
        throw error;
      }

      setAddSuccess(true);
      setNewSerial('');
      await fetchDevices(); // Refresh the list
      
      // Hide success message after 3 seconds
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err: any) {
      setAddError(err.message || 'Failed to add device.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteDevice = async (id: string, isAssigned: boolean) => {
    if (isAssigned) {
      alert("Cannot delete a device that is currently assigned to a Senior. Unassign it first.");
      return;
    }
    
    if (!confirm("Are you sure you want to permanently delete this device from the inventory?")) return;

    try {
      const { error } = await supabase.from('devices').delete().eq('id', id);
      if (error) throw error;
      setDevices(devices.filter(d => d.id !== id));
    } catch (error) {
      alert("Failed to delete device.");
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#462775]" /></div>;

  const unassignedCount = devices.filter(d => !d.senior_id).length;
  const podCount = devices.filter(d => d.type === 'POD').length;
  const wearableCount = devices.filter(d => d.type === 'WEARABLE').length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Device Inventory</h1>
          <p className="text-lg text-slate-500">Manage hardware nodes across the platform.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#462775] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#3a2060] transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" /> Register New Device
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><Server className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500">Ready to Assign</p>
            <p className="text-2xl font-black text-slate-900">{unassignedCount} Devices</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-[#462775] rounded-2xl flex items-center justify-center"><Smartphone className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500">Total Pods</p>
            <p className="text-2xl font-black text-slate-900">{podCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Watch className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-bold text-slate-500">Total Wearables</p>
            <p className="text-2xl font-black text-slate-900">{wearableCount}</p>
          </div>
        </div>
      </div>

      {/* Add Device Form */}
      {showAddForm && (
        <div className="bg-[#462775]/5 p-8 rounded-3xl border border-[#462775]/20 animate-in slide-in-from-top-4">
          <h2 className="text-xl font-bold text-[#462775] mb-6">Register Hardware to Inventory</h2>
          
          {addError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2"><AlertCircle className="h-4 w-4"/> {addError}</div>}
          {addSuccess && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm mb-6 flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Device registered successfully!</div>}

          <form onSubmit={handleAddDevice} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2">Serial Number</label>
              <input 
                type="text" required placeholder="e.g. POD-9999" 
                value={newSerial} onChange={e => setNewSerial(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none uppercase" 
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2">Device Type</label>
              <select 
                value={newType} onChange={e => setNewType(e.target.value as 'POD' | 'WEARABLE')}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none bg-white"
              >
                <option value="POD">WellNest Pod (Environmental)</option>
                <option value="WEARABLE">Wearable (Fall Detection)</option>
              </select>
            </div>
            <button type="submit" disabled={isAdding} className="w-full md:w-auto bg-[#462775] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#3a2060] disabled:opacity-70 flex items-center justify-center gap-2 h-[50px]">
              {isAdding ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save to Database'}
            </button>
          </form>
        </div>
      )}

      {/* Device List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">All Registered Devices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Device</th>
                <th className="p-4 font-bold">Serial Number</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Battery</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No devices found in inventory.</td>
                </tr>
              ) : (
                devices.map(device => (
                  <tr key={device.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${device.type === 'POD' ? 'bg-purple-50 text-[#462775]' : 'bg-blue-50 text-blue-600'}`}>
                          {device.type === 'POD' ? <Smartphone className="h-5 w-5" /> : <Watch className="h-5 w-5" />}
                        </div>
                        <span className="font-bold text-slate-900">{device.type === 'POD' ? 'Pod' : 'Wearable'}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-sm text-slate-600">{device.serial_number}</td>
                    <td className="p-4">
                      {device.senior_id ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Assigned to {device.senior?.first_name} {device.senior?.last_name}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Ready to Assign
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${device.battery_level > 20 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${device.battery_level}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{device.battery_level}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteDevice(device.id, !!device.senior_id)}
                        className={`p-2 rounded-lg transition-colors ${device.senior_id ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={device.senior_id ? "Unassign device first to delete" : "Delete device"}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
