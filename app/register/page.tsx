/* eslint-disable @typescript-eslint/no-explicit-any */
// app/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, User, Shield, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CAREGIVER' | 'SENIOR'>('CAREGIVER');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Save their profile and role to our custom 'users' table
        const { error: dbError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: role,
        });

        if (dbError) throw dbError;

        // 3. Success! Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#462775] flex-col justify-center items-center p-12 text-white relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="bg-white p-6 rounded-3xl mb-8 shadow-2xl flex items-center justify-center w-32 h-32">
            <Image src="/logo.png" alt="WellNest Logo" width={100} height={100} className="w-full h-auto object-contain" priority unoptimized/>
          </div>
          <h1 className="text-5xl font-extrabold mb-6 tracking-tight">Join WellNest</h1>
          <p className="text-xl text-purple-200 max-w-md font-light leading-relaxed">
            Create your account to start monitoring your loved ones or managing your own independent living journey.
          </p>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100 my-8">
          
          <div className="text-center mb-8 lg:hidden flex flex-col items-center">
            <div className="bg-white p-3 rounded-xl mb-4 shadow-md border border-slate-100">
               <Image src="/logo.png" alt="WellNest Logo" width={50} height={50} className="w-12 h-auto" unoptimized/>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">WellNest</h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">Create an Account</h2>
          <p className="text-slate-500 mb-6">Fill in your details to get started.</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Name Fields (Side by Side) */}
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775] text-sm text-slate-900"
                    placeholder="John"
                  />
                </div>
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775] text-sm text-slate-900"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775] text-sm text-slate-900"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#462775] focus:border-[#462775] text-sm text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('CAREGIVER')}
                  className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    role === 'CAREGIVER' 
                      ? 'border-[#462775] bg-purple-50 text-[#462775] ring-1 ring-[#462775]' 
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="h-6 w-6" />
                  <span className="text-sm font-bold">Caregiver</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('SENIOR')}
                  className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    role === 'SENIOR' 
                      ? 'border-[#462775] bg-purple-50 text-[#462775] ring-1 ring-[#462775]' 
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <User className="h-6 w-6" />
                  <span className="text-sm font-bold">Senior</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#462775] hover:bg-[#3a2060] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#462775] transition-colors disabled:opacity-70 mt-4"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#462775] hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}