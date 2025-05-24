'use server';

import { createSupabase } from '@/lib/supabase';

export async function getContentWarningsStats() {
  const supabase = createSupabase();

  try {
    // Get total media items
    const { count: total, error: totalError } = await supabase
      .from('media')
      .select('*, media_types(is_ignored)', {
        count: 'exact',
        head: true,
      })
      .is('is_thumbnail_processed', true)
      .is('media_types.is_ignored', false);

    console.log('total: ', total);

    if (totalError) {
      return {
        stats: {
          total: 0,
          processed: 0,
          remaining: 0,
          percentComplete: 0,
        },
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
      .is('is_thumbnail_processed', true)
      .is('is_content_warnings_processed', true)
      .is('media_types.is_ignored', false);

    console.log('processed: ', processed);

    if (processedError) {
      return {
        stats: {
          total: 0,
          processed: 0,
          remaining: 0,
          percentComplete: 0,
        },
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
    };
  } catch (error) {
    console.error('Error getting content warning stats:', error);
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
