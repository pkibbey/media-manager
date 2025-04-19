'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Add an abort token to the active tokens list (server implementation)
 */
export async function addServerAbortToken(
  token: string,
  processType?: string,
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();

    // Store token in database
    const { error } = await supabase.from('abort_tokens').insert({
      token,
      process_type: processType || 'default',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toString(), // 24 hours from now
    });

    return !error;
  } catch (error) {
    console.error('Error adding server abort token:', error);
    return false;
  }
}

/**
 * Check if a token is in the abort list (server implementation)
 */
export async function checkServerAbortToken(token: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();

    // Check if token exists in database
    const { data, error } = await supabase
      .from('abort_tokens')
      .select('token')
      .eq('token', token)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error checking server abort token:', error);
    return false;
  }
}

/**
 * Clear a specific abort token (server implementation)
 */
export async function clearServerAbortToken(token: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();

    // Remove token from database
    const { error } = await supabase
      .from('abort_tokens')
      .delete()
      .eq('token', token);

    return !error;
  } catch (error) {
    console.error('Error clearing server abort token:', error);
    return false;
  }
}
