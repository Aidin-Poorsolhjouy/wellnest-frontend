// // app/page.tsx
// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // Automatically redirect users to the login page
  redirect('/login');
}

// import LiveAlerts from '@/components/LiveAlerts';
// import { Activity } from 'lucide-react';

// export default function Home() {
//   return (
//     <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
//       {/* The Real-Time Listener */}
//       <LiveAlerts />

//       <div className="max-w-5xl mx-auto pt-20 px-6">
//         <div className="flex items-center gap-3 mb-8">
//           <div className="bg-blue-600 p-3 rounded-lg">
//             <Activity className="text-white h-8 w-8" />
//           </div>
//           <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
//             WellNest <span className="text-blue-600">Command Center</span>
//           </h1>
//         </div>
        
//         <p className="text-lg text-slate-600 max-w-2xl mb-12">
//           Waiting for real-time telemetry. To test the system, send a high temperature reading via the Backend Swagger API.
//         </p>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
//             <h2 className="font-bold text-lg mb-2">Seniors Online</h2>
//             <p className="text-3xl font-black text-blue-600">0</p>
//           </div>
//           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
//             <h2 className="font-bold text-lg mb-2">Active Devices</h2>
//             <p className="text-3xl font-black text-blue-600">1</p>
//           </div>
//           <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
//             <h2 className="font-bold text-lg mb-2">System Status</h2>
//             <p className="text-lg font-bold text-emerald-500 flex items-center gap-2">
//               <span className="relative flex h-3 w-3">
//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
//                 <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
//               </span>
//               Monitoring Active
//             </p>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }
