'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { AllMediaStats } from '@/types/media-types';

/**
 * Get comprehensive statistics about all items in the system
 */
export async function getAllStats(): Promise<{
  success: boolean;
  data?: AllMediaStats;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  // Get total count of media items
  const { count: totalCount, error: totalError } = await supabase
    .from('media_items')
    .select('id', { count: 'exact', head: true });
  if (totalError) throw totalError;

  // Get total size of all media
  const { data: sizeData, error: sizeError } = await supabase
    .rpc('sum_file_sizes')
    .single();
  if (sizeError) throw sizeError;

  // Get error total count
  const { count: failureCount, error: erroredError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'failed');
  if (erroredError) {
    return {
      success: false,
      error: `Failed to reset thumbnails: ${erroredError.message}`,
    };
  }
  if (erroredError) throw erroredError;

  // Get timestamp correction needs
  const { count: timestampCorrectionCount } = await supabase
    .from('media_items')
    .select('media_date, processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .is('media_date', null)
    .eq('processing_states.type', 'timestamp_correction')
    // NOTE: Does this include all the right statuses?
    .not('processing_states.status', 'eq', 'failed');

  return {
    success: true,
    data: {
      totalCount: totalCount || 0,
      failureCount: failureCount || 0,
      totalSizeBytes: sizeData?.sum || 0,
      timestampCorrectionCount: timestampCorrectionCount || 0,
    },
  };
}
