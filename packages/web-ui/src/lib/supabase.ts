import 'dotenv/config.js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env.local' });

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Create a Supabase client for use in server components and API routes
export function createSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  console.log('supabaseUrl: ', supabaseUrl)
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY  || '';
  console.log('supabaseKey: ', supabaseKey)

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
}
