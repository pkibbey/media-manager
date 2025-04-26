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
  const { count: erroredCount, error: erroredError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .in('processing_states.status', ['error', 'failed', 'aborted']);
  if (erroredError) throw erroredError;

  // Get total skipped count
  const { count: skippedCount, error: skippedError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'skipped');
  if (skippedError) throw skippedError;

  // Get ignored files count
  const { count: ignoredCount, error: ignoredError } = await supabase
    .from('media_items')
    .select('id, file_types!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('file_types.ignore', true);
  if (ignoredError) throw ignoredError;

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
      erroredCount: erroredCount || 0,
      ignoredCount: ignoredCount || 0,
      skippedCount: skippedCount || 0,
      totalSizeBytes: sizeData?.sum || 0,
      timestampCorrectionCount: timestampCorrectionCount || 0,
    },
  };
}
