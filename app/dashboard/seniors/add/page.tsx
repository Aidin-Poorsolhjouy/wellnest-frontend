/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Smartphone, Watch, Mail, Lock, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { api } from '@/lib/api';

export default function AddSeniorPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    podSerial: '',
    wearableSerial: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // await axios.post('http://localhost:3000/users/create-senior', {
      //   caregiverId: user.id,
      //   ...formData
      // });
      await api.post('/users/create-senior', {
        caregiverId: user.id,
        ...formData,
      });

      router.push('/dashboard/seniors');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to add senior.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/seniors" className="flex items-center text-slate-500 hover:text-[#462775] mb-6 transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to My Seniors
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Add a New Senior</h1>
          <p className="text-slate-500">Create a login for them and assign monitoring devices.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Account Details */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Account Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
                    placeholder="Jane"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
                    placeholder="senior@email.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
                    placeholder="Create password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Device Setup */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Device Setup (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Pod */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  WellNest Pod
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-[#462775]" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
                    placeholder="POD-1001"
                    value={formData.podSerial}
                    onChange={e => setFormData({ ...formData, podSerial: e.target.value })}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Monitors room temperature & air quality</p>
              </div>

              {/* Wearable */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Wearable
                </label>
                <div className="relative">
                  <Watch className="absolute left-3 top-3 h-4 w-4 text-[#462775]" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
                    placeholder="WEAR-2001"
                    value={formData.wearableSerial}
                    onChange={e => setFormData({ ...formData, wearableSerial: e.target.value })}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Monitors falls & activity</p>
              </div>

            </div>
          </section>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#462775] text-white font-bold py-3 rounded-xl hover:bg-[#3a2060] transition-colors flex justify-center items-center disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Senior Account'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// // app/dashboard/seniors/add/page.tsx
// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { supabase } from '@/lib/supabase';
// import { User, Smartphone, Loader2, ChevronLeft } from 'lucide-react';
// import Link from 'next/link';

// export default function AddSeniorPage() {
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
  
//   const [formData, setFormData] = useState({
//     firstName: '',
//     lastName: '',
//     deviceSerial: '' // e.g., POD-1001
//   });

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError('');

//     try {
//       // 1. Get current Caregiver ID
//       const { data: { user: caregiver } } = await supabase.auth.getUser();
//       if (!caregiver) throw new Error("Not authenticated");

//       // 2. Check if Device Exists and is Available
//       const { data: device, error: deviceError } = await supabase
//         .from('devices')
//         .select('id, senior_id')
//         .eq('serial_number', formData.deviceSerial)
//         .single();

//       if (deviceError || !device) throw new Error("Device Serial Number not found.");
//       if (device.senior_id) throw new Error("This device is already assigned to another senior.");

//       // 3. Create the Senior Profile (Managed User)
//       // Note: We generate a random UUID for the senior since they don't have an Auth login yet
//       const newSeniorId = crypto.randomUUID();
      
//       const { error: createError } = await supabase.from('users').insert({
//         id: newSeniorId,
//         email: `managed-${newSeniorId}@wellnest.local`, // Placeholder email
//         first_name: formData.firstName,
//         last_name: formData.lastName,
//         role: 'SENIOR'
//       });

//       if (createError) throw createError;

//       // 4. Link Caregiver to Senior
//       const { error: linkError } = await supabase.from('caregiver_senior').insert({
//         caregiver_id: caregiver.id,
//         senior_id: newSeniorId
//       });

//       if (linkError) throw linkError;

//       // 5. Assign Device to Senior
//       const { error: assignError } = await supabase
//         .from('devices')
//         .update({ senior_id: newSeniorId })
//         .eq('id', device.id);

//       if (assignError) throw assignError;

//       // Success!
//       router.push('/dashboard/seniors');

//     } catch (err: any) {
//       setError(err.message || "Failed to add senior.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto">
//       <Link href="/dashboard/seniors" className="flex items-center text-slate-500 hover:text-[#462775] mb-6 transition-colors">
//         <ChevronLeft className="h-4 w-4 mr-1" /> Back to My Seniors
//       </Link>

//       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
//         <div className="mb-8">
//           <h1 className="text-2xl font-bold text-slate-900">Add a New Senior</h1>
//           <p className="text-slate-500">Create a profile and link a WellNest device.</p>
//         </div>

//         {error && (
//           <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100">
//             {error}
//           </div>
//         )}

//         <form onSubmit={handleSubmit} className="space-y-6">
//           {/* Personal Details */}
//           <div className="space-y-4">
//             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Personal Details</h3>
//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
//                 <div className="relative">
//                   <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                   <input
//                     type="text" required
//                     className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
//                     placeholder="Jane"
//                     value={formData.firstName}
//                     onChange={e => setFormData({...formData, firstName: e.target.value})}
//                   />
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
//                 <input
//                   type="text" required
//                   className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
//                   placeholder="Doe"
//                   value={formData.lastName}
//                   onChange={e => setFormData({...formData, lastName: e.target.value})}
//                 />
//               </div>
//             </div>
//           </div>

//           <hr className="border-slate-100" />

//           {/* Device Setup */}
//           <div className="space-y-4">
//             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Device Setup</h3>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">Pod Serial Number</label>
//               <div className="relative">
//                 <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
//                 <input
//                   type="text" required
//                   className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775]"
//                   placeholder="e.g. POD-1001"
//                   value={formData.deviceSerial}
//                   onChange={e => setFormData({...formData, deviceSerial: e.target.value})}
//                 />
//               </div>
//               <p className="text-xs text-slate-500 mt-2">Found on the bottom of the WellNest Pod.</p>
//             </div>
//           </div>

//           <div className="pt-4">
//             <button
//               type="submit"
//               disabled={isLoading}
//               className="w-full bg-[#462775] text-white font-bold py-3 rounded-xl hover:bg-[#3a2060] transition-colors flex justify-center items-center disabled:opacity-70"
//             >
//               {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Profile & Link Device'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }