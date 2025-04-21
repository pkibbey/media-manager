'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Add an abort token to the active tokens list (server implementation)
 * This version is aligned with the client-side abort-tokens.ts implementation
 */
export async function addServerAbortToken(token: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();

    // First, clean up expired tokens (older than 1 hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    await supabase
      .from('abort_tokens')
      .delete()
      .lt('created_at', oneHourAgo.toISOString());

    // Store token in database
    const { error } = await supabase.from('abort_tokens').upsert({
      token,
      created_at: new Date().toISOString(),
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
    if (!token) return false;

    const supabase = createServerSupabaseClient();

    // Check if token exists in database
    const { data, error } = await supabase
      .from('abort_tokens')
      .select('token')
      .eq('token', token)
      .single();

    // Return false if we got an error (token not found) or no data
    if (error || !data) {
      return false;
    }

    // The token exists in the abort_tokens table - this means the user requested cancellation
    return true;
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
    if (!token) return true;

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

/**
 * Clear all abort tokens (server implementation)
 */
export async function clearAllServerAbortTokens(): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();

    // Remove all tokens from database
    const { error } = await supabase
      .from('abort_tokens')
      .delete()
      .neq('token', '');

    return !error;
  } catch (error) {
    console.error('Error clearing all server abort tokens:', error);
    return false;
  }
}
