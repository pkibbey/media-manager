'use server';

// Store active abort tokens
const abortTokens = new Set<string>();

/**
 * Add a new abort token
 */
export async function addAbortToken(token: string): Promise<void> {
  abortTokens.add(token);
}

/**
 * Check if a token is in the abort set
 */
export async function isAborted(token: string): Promise<boolean> {
  return abortTokens.has(token);
}

/**
 * Remove a token from the abort set
 */
export async function removeAbortToken(token: string): Promise<void> {
  abortTokens.delete(token);
}

/**
 * Clear all abort tokens
 */
export async function clearAbortTokens(): Promise<void> {
  abortTokens.clear();
}
