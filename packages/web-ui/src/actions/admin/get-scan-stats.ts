'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Get statistics about media scanning status
 *
 * @returns Object with scan processing statistics
 */
export async function getScanStats() {
  try {
    const supabase = createSupabase();

    // Count all media records
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    return {
      stats: {
        total: totalCount || 0,
        processed: totalCount || 0,
        remaining: 0, // This doesn't apply to scan stats
        percentComplete: 100, // Always 100% since we don't know the total
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting scan stats:', error);
    return {
      stats: {
        total: 0,
        processed: 0,
        remaining: 0,
        percentComplete: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
