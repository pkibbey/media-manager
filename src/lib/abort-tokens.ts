'use server';

import { 
  addAbortToken as addAbortTokenQuery,
  isAborted as isAbortedQuery,
  removeAbortToken as removeAbortTokenQuery,
  clearAllAbortTokens,
  getActiveAbortTokens
} from './query-helpers';

/**
 * Add a new abort token to the database
 */
export async function addAbortToken(token: string): Promise<void> {
  // Use the query helper to add the token and clean up expired tokens
  await addAbortTokenQuery(token);
}

/**
 * Check if a token exists in the database (meaning it's aborted)
 */
export async function isAborted(token: string): Promise<boolean> {
  if (!token) return false;
  
  // Use the query helper to check if the token is aborted
  return isAbortedQuery(token);
}

/**
 * Remove a token from the database
 */
export async function removeAbortToken(token: string): Promise<void> {
  if (!token) return;
  
  // Use the query helper to remove the token
  await removeAbortTokenQuery(token);
}

/**
 * Clear all abort tokens
 */
export async function clearAbortTokens(): Promise<void> {
  // Use the query helper to clear all tokens
  await clearAllAbortTokens();
}

/**
 * Get all active abort tokens - useful for debugging
 */
export async function getAbortTokens(): Promise<{ token: string; created_at: string }[] | null> {
  const { data, error } = await getActiveAbortTokens();
  
  if (error) {
    console.error('Error getting abort tokens:', error);
    return null;
  }
  
  return data;
}
