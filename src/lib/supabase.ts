import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase configuration. Please check your .env file or environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  global: {
    fetch: (...args: [input: RequestInfo | URL, init?: RequestInit | undefined]) => globalThis.fetch(...args),
  },
});
