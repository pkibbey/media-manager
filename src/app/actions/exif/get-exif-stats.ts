'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get EXIF processing statistics using Supabase JS queries.
 */
export async function getExifStats(): Action<UnifiedStats> {
  const supabase = createServerSupabaseClient();

  const { error: allMediaItemsError, count: allMediaItemsCount } =
    await supabase
      .from('media_items')
      .select('id, file_types(*)', { count: 'exact', head: true })
      .eq('file_types.category', 'image')
      .is('file_types.ignore', false);

  const { error: successError, count: successCount } = await supabase
    .from('media_items')
    .select('id, file_types(*), processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'success')
    .eq('file_types.category', 'image')
    .is('file_types.ignore', false);

  const { error: failedError, count: failedCount } = await supabase
    .from('media_items')
    .select('id, file_types(*), processing_states!inner(*)', {
      count: 'exact',
      head: true,
    })
    .eq('processing_states.status', 'failure')
    .eq('file_types.category', 'image')
    .is('file_types.ignore', false);

  const hasErrors = Boolean(allMediaItemsError || successError || failedError);

  const counts = {
    total: allMediaItemsCount || 0,
    success: successCount || 0,
    failed: failedCount || 0,
  };

  if (hasErrors) {
    return {
      data: {
        status: 'error',
        message: `Failed to fetch EXIF stats: ${allMediaItemsError?.message || ''} ${successError?.message || ''} ${failedError?.message || ''}`,
        counts,
      },
      error: allMediaItemsError || successError || failedError,
      count: null,
    };
  }

  return {
    data: {
      status: 'success',
      message: `${counts.success} of ${counts.total} images have EXIF data`,
      counts,
    },
    error: null,
    count: allMediaItemsCount,
  };
}
