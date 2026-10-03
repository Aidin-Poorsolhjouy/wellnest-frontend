// app/dashboard/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import LiveAlerts from '@/components/LiveAlerts';
import { 
  LayoutDashboard, Users, MessageSquare, Settings, 
  LogOut, Menu, Activity, Pill, Home,
  Server,
  Sliders
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const[isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      // Fetch role to determine which menu to show
      const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single();
      if (profile) setUserRole(profile.role);
      
      setIsLoading(false);
    };
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-[#462775]">Loading WellNest...</div>;

  // --- DYNAMIC NAVIGATION ---
  const caregiverNav =[
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Seniors', href: '/dashboard/seniors', icon: Users },
    { name: 'Messages', href: '/dashboard/chat', icon: MessageSquare },
    // { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const seniorNav =[
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'My Health', href: '/dashboard/my-health', icon: Activity },
    { name: 'Medications', href: '/dashboard/medications', icon: Pill },
    { name: 'Messages', href: '/dashboard/chat', icon: MessageSquare },
    
  ];

  const adminNav =[
    { name: 'System Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'User Directory', href: '/dashboard/admin/users', icon: Users },
    { name: 'Device Inventory', href: '/dashboard/admin/devices', icon: Server },
    { name: 'Global Thresholds', href: '/dashboard/admin/thresholds', icon: Sliders },
  ];

  let navItems = caregiverNav;
  if (userRole === 'SENIOR') navItems = seniorNav;
  if (userRole === 'ADMIN') navItems = adminNav;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Only show LiveAlerts popup to Caregivers/Admins */}
      {userRole !== 'SENIOR' && <LiveAlerts />}

      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200 fixed h-full z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 relative">
             <Image src="/logo.png" alt="WellNest" fill className="object-contain" unoptimized/>
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">WellNest</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive ? 'bg-[#462775] text-white shadow-md shadow-purple-200' : 'text-slate-600 hover:bg-slate-50 hover:text-[#462775]'
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium">
            <LogOut className="h-5 w-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 relative"><Image src="/logo.png" alt="WellNest" fill className="object-contain" unoptimized/></div>
            <span className="font-bold text-slate-900">WellNest</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}><Menu className="h-6 w-6 text-slate-600" /></button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50">
                <item.icon className="h-5 w-5" /> {item.name}
              </Link>
            ))}
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-600 w-full"><LogOut className="h-5 w-5" /> Sign Out</button>
          </div>
        )}

        <div className="p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}