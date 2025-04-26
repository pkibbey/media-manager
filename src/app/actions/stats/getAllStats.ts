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

  // Get exif processing success count
  const { count: exifCount, error: exifError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.type', 'exif');

  console.log('exifCount: ', exifCount);
  if (exifError) throw exifError;

  // Get exif processing error count
  const { count: erroredCount, error: erroredError } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*), file_types!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'error');
  if (erroredError) throw erroredError;

  // Get exif processing skipped count
  const { count: skippedCount, error: skippedError } = await supabase
    .from('media_items')
    .select('processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'aborted');
  if (skippedError) throw skippedError;

  // Get ignored files count - this specifically counts files with ignored file types
  const { count: ignoredCount, error: ignoredError } = await supabase
    .from('media_items')
    .select('file_types!inner(*)', {
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
    .not('processing_states.status', 'eq', 'failed');

  return {
    success: true,
    data: {
      totalMediaItems: totalCount || 0,
      totalSizeBytes: sizeData?.sum || 0,
      exifCount: exifCount || 0,
      erroredCount: erroredCount || 0,
      ignoredCount: ignoredCount || 0,
      skippedCount: skippedCount || 0,
      timestampCorrectionCount: timestampCorrectionCount || 0,
    },
  };
}
