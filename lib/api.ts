// wellnest-frontend/lib/api.ts

import axios from 'axios';

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