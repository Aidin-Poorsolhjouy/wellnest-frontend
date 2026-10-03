// app/dashboard/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Shield, HeartPulse, User as UserIcon, Trash2, Loader2, Search, Mail, Plus, Edit2, Link as LinkIcon, X, CheckSquare, Square } from 'lucide-react';
import { api } from '@/lib/api';
import axios from 'axios';

type UserProfile = { id: string; first_name: string; last_name: string; email: string; role: 'ADMIN' | 'CAREGIVER' | 'SENIOR'; created_at: string; };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const[isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ADMIN' | 'CAREGIVER' | 'SENIOR'>('ALL');
  const[searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const[showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({ id: '', firstName: '', lastName: '', email: '', password: '', role: 'CAREGIVER' });
  const [formError, setFormError] = useState('');
  
  // Assignment State
  const [assignTargetUser, setAssignTargetUser] = useState<UserProfile | null>(null);
  const [availableLinks, setAvailableLinks] = useState<UserProfile[]>([]);
  const[currentLinks, setCurrentLinks] = useState<string[]>([]); // Array of IDs

  useEffect(() => { fetchUsers(); },[]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserProfile[]);
    setIsLoading(false);
  };

  // --- CRUD HANDLERS ---

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessingId('add'); setFormError('');
    try {
      // await axios.post('http://localhost:3000/users/admin-create', formData);
      await api.post('/users/admin-create', formData);
      await fetchUsers();
      setShowAddModal(false);
    } catch (err: any) { setFormError(err.response?.data?.message || "Failed to create user."); } finally { setProcessingId(null); }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault(); setProcessingId('edit'); setFormError('');
    try {
      // await axios.patch(`http://localhost:3000/users/${formData.id}`, { firstName: formData.firstName, lastName: formData.lastName });
      await api.patch(`/users/${formData.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      await fetchUsers();
      setShowEditModal(false);
    } catch (err: any) { setFormError("Failed to update user."); } finally { setProcessingId(null); }
  };

  const handleDeleteUser = async (id: string, name: string, role: string) => {
    if (role === 'ADMIN') return alert("Cannot delete an Admin account.");
    if (!confirm(`Permanently delete ${name}?`)) return;
    setProcessingId(id);
    try {
      // await axios.delete(`http://localhost:3000/users/senior/${id}`);
      await api.delete(`/users/senior/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error) { alert("Failed to delete user."); } finally { setProcessingId(null); }
  };

  // --- ASSIGNMENT HANDLERS ---

  const openAssignModal = async (user: UserProfile) => {
    setAssignTargetUser(user);
    setShowAssignModal(true);
    setAvailableLinks([]); setCurrentLinks([]);

    // If managing a SENIOR, fetch all CAREGIVERS to link
    if (user.role === 'SENIOR') {
      const caregivers = users.filter(u => u.role === 'CAREGIVER');
      setAvailableLinks(caregivers);
      const { data } = await supabase.from('caregiver_senior').select('caregiver_id').eq('senior_id', user.id);
      if (data) setCurrentLinks(data.map(d => d.caregiver_id));
    } 
    // If managing a CAREGIVER, fetch all SENIORS to link
    else if (user.role === 'CAREGIVER') {
      const seniors = users.filter(u => u.role === 'SENIOR');
      setAvailableLinks(seniors);
      const { data } = await supabase.from('caregiver_senior').select('senior_id').eq('caregiver_id', user.id);
      if (data) setCurrentLinks(data.map(d => d.senior_id));
    }
  };

  const toggleAssignment = async (targetId: string) => {
    if (!assignTargetUser) return;
    const isCurrentlyLinked = currentLinks.includes(targetId);
    
    const caregiverId = assignTargetUser.role === 'CAREGIVER' ? assignTargetUser.id : targetId;
    const seniorId = assignTargetUser.role === 'SENIOR' ? assignTargetUser.id : targetId;

    try {
      if (isCurrentlyLinked) {
        // await axios.delete('http://localhost:3000/users/relationships', { data: { caregiverId, seniorId } });
        await api.delete('/users/relationships', {
          data: { caregiverId, seniorId },
        });
        setCurrentLinks(currentLinks.filter(id => id !== targetId));
      } else {
        // await axios.post('http://localhost:3000/users/relationships', { caregiverId, seniorId });
        await api.post('/users/relationships', {
          caregiverId,
          seniorId,
        });
        setCurrentLinks([...currentLinks, targetId]);
      }
    } catch (e) { alert("Failed to update assignment."); }
  };

  // --- UI HELPERS ---

  const filteredUsers = users.filter(user => {
    const matchesRole = filter === 'ALL' || user.role === filter;
    const matchesSearch = user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) || user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') return <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-[#462775]"><Shield className="h-3 w-3"/> Admin</span>;
    if (role === 'CAREGIVER') return <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700"><HeartPulse className="h-3 w-3"/> Caregiver</span>;
    return <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700"><UserIcon className="h-3 w-3"/> Senior</span>;
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#462775]" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">User Directory</h1>
          <p className="text-lg text-slate-500">Manage all accounts across the WellNest platform.</p>
        </div>
        <button onClick={() => { setFormData({ id: '', firstName: '', lastName: '', email: '', password: '', role: 'CAREGIVER' }); setShowAddModal(true); }} className="bg-[#462775] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#3a2060] transition-colors flex items-center gap-2">
          <Plus className="h-5 w-5" /> Add New User
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm">
          {['ALL', 'CAREGIVER', 'SENIOR', 'ADMIN'].map((r) => (
            <button key={r} onClick={() => setFilter(r as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === r ? 'bg-[#462775] text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
              {r === 'ALL' ? 'All Users' : r.charAt(0) + r.slice(1).toLowerCase() + 's'}
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3 px-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-slate-900" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <th className="p-5 font-bold">User</th>
                <th className="p-5 font-bold">Contact</th>
                <th className="p-5 font-bold">Role</th>
                <th className="p-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-slate-500">No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {user.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-sm text-slate-600 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" />{user.email}</td>
                    <td className="p-5">{getRoleBadge(user.role)}</td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Assign Button (Only for Caregivers and Seniors) */}
                        {user.role !== 'ADMIN' && (
                          <button onClick={() => openAssignModal(user)} className="p-2 text-slate-400 hover:text-[#462775] hover:bg-purple-50 rounded-lg transition-colors" title="Manage Assignments">
                            <LinkIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button onClick={() => { setFormData({ ...formData, id: user.id, firstName: user.first_name, lastName: user.last_name }); setShowEditModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit User">
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id, user.first_name, user.role)} disabled={processingId === user.id || user.role === 'ADMIN'} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Delete User">
                          {processingId === user.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {formError && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{formError}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">First Name</label><input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#462775]" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label><input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#462775]" /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Email</label><input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#462775]" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Password</label><input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#462775]" /></div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})} className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#462775] bg-white">
                  <option value="CAREGIVER">Caregiver</option>
                  <option value="SENIOR">Senior</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button type="submit" disabled={processingId === 'add'} className="w-full bg-[#462775] text-white py-3 rounded-xl font-bold hover:bg-[#3a2060] mt-4 flex justify-center">
                {processingId === 'add' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              {formError && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{formError}</p>}
              <div><label className="block text-xs font-bold text-slate-700 mb-1">First Name</label><input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#462775]" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label><input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#462775]" /></div>
              <button type="submit" disabled={processingId === 'edit'} className="w-full bg-[#462775] text-white py-3 rounded-xl font-bold hover:bg-[#3a2060] mt-4 flex justify-center">
                {processingId === 'edit' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Assignments Modal */}
      {showAssignModal && assignTargetUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Manage Assignments</h2>
                <p className="text-sm text-slate-500">For {assignTargetUser.first_name} {assignTargetUser.last_name} ({assignTargetUser.role})</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                Assign {assignTargetUser.role === 'SENIOR' ? 'Caregivers' : 'Seniors'}
              </p>
              
              {availableLinks.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No available users to assign.</p>
              ) : (
                availableLinks.map(linkUser => {
                  const isAssigned = currentLinks.includes(linkUser.id);
                  return (
                    <div 
                      key={linkUser.id} 
                      onClick={() => toggleAssignment(linkUser.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                        isAssigned ? 'bg-purple-50 border-[#462775]' : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                          {linkUser.first_name[0]}
                        </div>
                        <span className={`font-bold ${isAssigned ? 'text-[#462775]' : 'text-slate-700'}`}>
                          {linkUser.first_name} {linkUser.last_name}
                        </span>
                      </div>
                      {isAssigned ? <CheckSquare className="h-5 w-5 text-[#462775]" /> : <Square className="h-5 w-5 text-slate-300" />}
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowAssignModal(false)} className="w-full bg-[#462775] text-white py-3 rounded-xl font-bold hover:bg-[#3a2060]">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}