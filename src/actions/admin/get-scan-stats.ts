'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Get statistics about media scanning status
 *
 * @returns Object with scan processing statistics
 */
export async function getScanStats(): Promise<{
  stats: {
    total: number;
    scanned: number;
    remaining: number;
    percentComplete: number;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    // Count all media records
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // The total count represents the already scanned files
    // For the scan page, we don't have a separate "remaining" count since
    // we don't know how many files are in the file system until we scan them
    // So we just return the current total as the "scanned" count
    return {
      stats: {
        total: totalCount || 0,
        scanned: totalCount || 0,
        remaining: 0, // This doesn't apply to scan stats
        percentComplete: 100, // Always 100% since we don't know the total
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting scan stats:', error);
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
