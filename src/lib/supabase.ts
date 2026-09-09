import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is niet geconfigureerd. Zet VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ' +
      'in .env.local (lokaal) of in de repository secrets (GitHub Actions).'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // On the web, localStorage replaces AsyncStorage.
    storage: window.localStorage,
    storageKey: 'chorequest_auth',
    autoRefreshToken: true,
    persistSession: true,
    // Unlike the native app, the browser must consume the tokens that Supabase
    // appends to the URL after email confirmation and password recovery.
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
