import axios from 'axios';
import { supabase } from '@/lib/supabase';

const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

if (!rawBackendUrl) {
  throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
}

export const BACKEND_URL = rawBackendUrl.replace(/\/+$/, '');

export const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});
