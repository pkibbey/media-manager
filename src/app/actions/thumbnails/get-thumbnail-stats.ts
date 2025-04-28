'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get statistics about thumbnail status
 * Uses the new UnifiedStats structure
 */
export async function getThumbnailStats(): Action<UnifiedStats> {
  const supabase = createServerSupabaseClient();

  // Get total count of all compatible image files, excluding ignored file types
  const { error: totalError, count: totalCount } = await supabase
    .from('media_items')
    .select('id, file_types!inner(*)', { count: 'exact', head: true })
    .eq('file_types.category', 'image')
    .eq('file_types.ignore', false);

  // Get success count - items with thumbnails
  const { error: successError, count: successCount } = await supabase
    .from('media_items')
    .select('id', { count: 'exact', head: true })
    .not('thumbnail_path', 'is', null)
    .eq('file_types.category', 'image')
    .eq('file_types.ignore', false);

  // Get failure count
  const { error: failedError, count: failedCount } = await supabase
    .from('media_items')
    .select('id, processing_states!inner(*)', { count: 'exact', head: true })
    .eq('processing_states.type', 'thumbnail')
    .eq('processing_states.status', 'failure')
    .eq('file_types.category', 'image')
    .eq('file_types.ignore', false);

  const hasErrors = Boolean(totalError || successError || failedError);

  const counts = {
    total: totalCount || 0,
    success: successCount || 0,
    failed: failedCount || 0,
  };

  if (hasErrors) {
    return {
      data: {
        status: 'error',
        message: `Failed to fetch thumbnail stats: ${totalError?.message || ''} ${successError?.message || ''} ${failedError?.message || ''}`,
        counts,
      },
      error: totalError || successError || failedError,
      count: null,
    };
  }

  return {
    data: {
      status: 'success',
      message: `${counts.success} of ${counts.total} images have thumbnails`,
      counts,
    },
    error: null,
    count: totalCount,
  };
}
