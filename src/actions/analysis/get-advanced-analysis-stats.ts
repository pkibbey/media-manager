'use server';

import { createSupabase } from '@/lib/supabase';

export async function getAdvancedAnalysisStats() {
  const supabase = createSupabase();

  try {
    // Get total media items
    const { count: total, error: totalError } = await supabase
      .from('media')
      .select('*, media_types(is_ignored)', {
        count: 'exact',
        head: true,
      })
      .is('is_basic_processed', true)
      .is('media_types.is_ignored', false);

    if (totalError) {
      return {
        stats: null,
        error: totalError.message,
      };
    }

    // Get processed media items
    const { count: processed, error: processedError } = await supabase
      .from('media')
      .select('*, media_types(is_ignored)', {
        count: 'exact',
        head: true,
      })
      .is('is_advanced_processed', true)
      .is('is_basic_processed', true)
      .is('media_types.is_ignored', false);

    if (processedError) {
      return {
        stats: null,
        error: processedError.message,
      };
    }

    // Calculate remaining and percentage
    const remaining = (total || 0) - (processed || 0);
    const percentComplete = total
      ? Math.round(((processed || 0) * 100) / total)
      : 0;

    return {
      stats: {
        total: total || 0,
        processed: processed || 0,
        remaining,
        percentComplete,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting advanced analysis stats:', error);
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
