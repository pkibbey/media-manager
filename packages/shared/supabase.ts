import { createClient } from '@supabase/supabase-js';
import { serverEnv } from './env';
import type { Database } from './types';

// Create a Supabase client for use in server components, API routes, and workers
export function createSupabase() {
  return createClient<Database>(
    serverEnv.SUPABASE_URL, 
    serverEnv.SUPABASE_SERVICE_ROLE_KEY, 
    {
      auth: {
        persistSession: false,
      },
    }
  );
}
