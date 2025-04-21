'use server';

import { createServerSupabaseClient } from './supabase';

/**
 * Add a new abort token to the database
 */
export async function addAbortToken(token: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  // First, clean up expired tokens (older than 1 hour)
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  await supabase
    .from('abort_tokens')
    .delete()
    .lt('created_at', oneHourAgo.toISOString());

  // Add the new token
  await supabase.from('abort_tokens').upsert({
    token,
    created_at: new Date().toISOString(),
  });
}

/**
 * Check if a token exists in the database (meaning it's aborted)
 */
export async function isAborted(token: string): Promise<boolean> {
  if (!token) return false;

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('abort_tokens')
    .select('token')
    .eq('token', token)
    .single();

  // Return false if we got an error (token not found) or no data
  // Only return true if we successfully found the token AND it's marked for abortion
  if (error || !data) {
    return false;
  }

  // The token exists in the abort_tokens table - this means the user requested cancellation
  return true;
}

/**
 * Remove a token from the database
 */
export async function removeAbortToken(token: string): Promise<void> {
  if (!token) return;

  const supabase = createServerSupabaseClient();

  await supabase.from('abort_tokens').delete().eq('token', token);
}

/**
 * Clear all abort tokens
 */
export async function clearAbortTokens(): Promise<void> {
  const supabase = createServerSupabaseClient();

  await supabase.from('abort_tokens').delete().neq('token', ''); // Delete all tokens
}
