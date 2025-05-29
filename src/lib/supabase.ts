import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '@/types/supabase';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase client for use in server components and API routes
export function createSupabase() {
  const supabaseUrl = SUPABASE_URL;
  const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
}
