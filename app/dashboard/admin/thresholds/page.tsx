// app/dashboard/admin/thresholds/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sliders, Thermometer, Wind, Activity, Plus, Edit2, Trash2, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';

type Threshold = {
  id: string;
  metric: string;
  min_value: number | null;
  max_value: number | null;
};

export default function AdminThresholdsPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<{ id: string; metric: string; min: string; max: string }>({
    id: '', metric: 'TEMPERATURE', min: '', max: ''
  });

  useEffect(() => {
    fetchThresholds();
  },[]);

  const fetchThresholds = async () => {
    setIsLoading(true);
    // Fetch only GLOBAL thresholds (where senior_id is null)
    const { data, error } = await supabase
      .from('thresholds')
      .select('*')
      .is('senior_id', null)
      .order('metric', { ascending: true });

    if (data) setThresholds(data);
    setIsLoading(false);
  };

  const handleOpenAdd = () => {
    setFormData({ id: '', metric: 'TEMPERATURE', min: '', max: '' });
    setFormError('');
    setShowForm(true);
  };

  const handleOpenEdit = (t: Threshold) => {
    setFormData({
      id: t.id,
      metric: t.metric,
      min: t.min_value !== null ? t.min_value.toString() : '',
      max: t.max_value !== null ? t.max_value.toString() : ''
    });
    setFormError('');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this global threshold? The system will no longer alert on this metric unless a personal override exists.")) return;
    
    try {
      const { error } = await supabase.from('thresholds').delete().eq('id', id);
      if (error) throw error;
      setThresholds(thresholds.filter(t => t.id !== id));
    } catch (error) {
      alert("Failed to delete threshold.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    const minVal = formData.min === '' ? null : parseFloat(formData.min);
    const maxVal = formData.max === '' ? null : parseFloat(formData.max);

    if (minVal === null && maxVal === null) {
      setFormError("You must provide at least a Minimum or Maximum value.");
      return;
    }

    if (minVal !== null && maxVal !== null && minVal >= maxVal) {
      setFormError("Minimum value must be less than Maximum value.");
      return;
    }

    setIsSaving(true);

    try {
      // Check if a global threshold for this metric already exists (if adding new)
      if (!formData.id) {
        const existing = thresholds.find(t => t.metric === formData.metric);
        if (existing) throw new Error(`A global threshold for ${formData.metric} already exists. Please edit it instead.`);
      }

      const payload = {
        metric: formData.metric,
        min_value: minVal,
        max_value: maxVal,
        senior_id: null // Explicitly null for Global
      };

      if (formData.id) {
        const { error } = await supabase.from('thresholds').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('thresholds').insert(payload);
        if (error) throw error;
      }

      await fetchThresholds();
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to save threshold.");
    } finally {
      setIsSaving(false);
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'TEMPERATURE': return <Thermometer className="h-6 w-6 text-orange-500" />;
      case 'CO2': return <Wind className="h-6 w-6 text-teal-500" />;
      case 'INACTIVITY_HOURS': return <Activity className="h-6 w-6 text-[#462775]" />;
      default: return <Sliders className="h-6 w-6 text-slate-500" />;
    }
  };

  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'TEMPERATURE': return '°C';
      case 'AIR_QUALITY_PERCENT': return '%';
      case 'INACTIVITY_HOURS': return 'Hours';
      default: return '';
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#462775]" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Global Safety Thresholds</h1>
          <p className="text-lg text-slate-500">Define the baseline alert rules for the entire platform.</p>
        </div>
        {!showForm && (
          <button 
            onClick={handleOpenAdd}
            className="bg-[#462775] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#3a2060] transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Add Global Rule
          </button>
        )}
      </div>

      {/* Form Area */}
      {showForm && (
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-[#462775]/20 animate-in slide-in-from-top-4 ring-4 ring-purple-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#462775] flex items-center gap-2">
              <Sliders className="h-6 w-6" /> {formData.id ? 'Edit Global Rule' : 'Create Global Rule'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          {formError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2 font-medium">
              <AlertCircle className="h-5 w-5"/> {formError}
            </div>
          )}

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Metric to Monitor</label>
              <select 
                value={formData.metric} 
                onChange={e => setFormData({...formData, metric: e.target.value})}
                disabled={!!formData.id} // Don't allow changing metric type while editing
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none bg-slate-50 disabled:opacity-60"
              >
                <option value="TEMPERATURE">Room Temperature</option>
                <option value="AIR_QUALITY_PERCENT">Air Quality (%)</option>
                <option value="INACTIVITY_HOURS">Inactivity Duration</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Minimum Safe Value</label>
              <div className="relative">
                <input 
                  type="number" step="0.1" placeholder="e.g. 18" 
                  value={formData.min} onChange={e => setFormData({...formData, min: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none" 
                />
                <span className="absolute right-4 top-3 text-slate-400 font-medium">{getMetricUnit(formData.metric)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Alert triggers if reading drops below this.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Maximum Safe Value</label>
              <div className="relative">
                <input 
                  type="number" step="0.1" placeholder="e.g. 30" 
                  value={formData.max} onChange={e => setFormData({...formData, max: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#462775] outline-none" 
                />
                <span className="absolute right-4 top-3 text-slate-400 font-medium">{getMetricUnit(formData.metric)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Alert triggers if reading exceeds this.</p>
            </div>

            <div className="md:col-span-3 flex justify-end mt-4 pt-6 border-t border-slate-100">
              <button 
                type="submit" 
                disabled={isSaving} 
                className="bg-[#462775] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#3a2060] disabled:opacity-70 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Save Global Rule</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Thresholds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {thresholds.length === 0 && !showForm ? (
          <div className="md:col-span-2 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
            <Sliders className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No Global Rules Set</h3>
            <p className="text-slate-500 mt-2">Add your first threshold to start monitoring the platform.</p>
          </div>
        ) : (
          thresholds.map(t => (
            <div key={t.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-[#462775]/30 transition-colors">
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                    {getMetricIcon(t.metric)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{t.metric.replace('_', ' ')}</h3>
                    <span className="text-xs font-bold text-[#462775] bg-purple-50 px-2 py-1 rounded-md">Global Rule</span>
                  </div>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(t)} className="p-2 text-slate-400 hover:text-[#462775] hover:bg-purple-50 rounded-lg transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Minimum</p>
                  <p className="text-xl font-black text-slate-900">
                    {t.min_value !== null ? `${t.min_value} ${getMetricUnit(t.metric)}` : <span className="text-slate-300">None</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Maximum</p>
                  <p className="text-xl font-black text-slate-900">
                    {t.max_value !== null ? `${t.max_value} ${getMetricUnit(t.metric)}` : <span className="text-slate-300">None</span>}
                  </p>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
