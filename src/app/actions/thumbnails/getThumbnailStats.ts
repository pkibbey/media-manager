'use server';

import { includeMedia } from '@/lib/mediaFilters';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ThumbnailStats } from '@/types/thumbnail-types';

/**
 * Get statistics about thumbnail status
 */
export async function getThumbnailStats(): Promise<{
  success: boolean;
  stats?: ThumbnailStats;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count of all compatible image files, excluding ignored file types
    const { count: totalCount, error: totalError } = await includeMedia(
      supabase
        .from('media_items')
        .select('*, file_types!inner(*)', { count: 'exact', head: true }),
    );

    console.log('Total compatible files count:', totalCount);

    if (totalError) {
      throw new Error(`Failed to get total file count: ${totalError.message}`);
    }

    // Get count of files with successful thumbnails
    // Note: We don't need to filter by file_types.ignore here since we're only
    // looking at processing_states that were already created, and those are already
    // filtered by the time they were created
    const { count: withThumbnailsCount, error: withThumbnailsError } =
      await includeMedia(
        supabase
          .from('media_items')
          .select('*, file_types!inner(*), processing_states!inner(*)', {
            count: 'exact',
            head: true,
          })
          .eq('processing_states.type', 'thumbnail')
          .eq('processing_states.status', 'success'),
      );

    console.log('Files with thumbnails count:', withThumbnailsCount);

    if (withThumbnailsError) {
      throw new Error(
        `Failed to get files with thumbnails: ${withThumbnailsError.message}`,
      );
    }

    // Get count of files skipped due to being large
    const { count: skippedLargeFilesCount, error: skippedLargeFilesError } =
      await includeMedia(
        supabase
          .from('media_items')
          .select('*, file_types!inner(*), processing_states!inner(*)', {
            count: 'exact',
            head: true,
          })
          .eq('processing_states.type', 'thumbnail')
          .eq('processing_states.status', 'skipped'),
      );

    console.log('Skipped large files count:', skippedLargeFilesCount);

    if (skippedLargeFilesError) {
      throw new Error(
        `Failed to get skipped large files count: ${skippedLargeFilesError.message}`,
      );
    }

    // Get count of files with errors
    const { count: erroredCount, error: erroredError } = await includeMedia(
      supabase
        .from('media_items')
        .select('*, file_types!inner(*), processing_states!inner(*)', {
          count: 'exact',
          head: true,
        })
        .eq('processing_states.type', 'thumbnail')
        .eq('processing_states.status', 'error'),
    );

    console.log('Errored files count:', erroredCount);

    if (erroredError) {
      throw new Error(
        `Failed to get errored files count: ${erroredError.message}`,
      );
    }

    const stats = {
      totalCompatibleFiles: totalCount || 0,
      filesWithThumbnails: withThumbnailsCount || 0,
      skippedLargeFiles: skippedLargeFilesCount || 0,
      errored: erroredCount || 0,
    };

    const unprocessedFilesCount =
      stats.totalCompatibleFiles -
      (stats.filesWithThumbnails + stats.skippedLargeFiles + stats.errored);

    const finalStats = {
      ...stats,
      filesPending: unprocessedFilesCount || 0,
    };

    console.log('Final thumbnail stats:', finalStats);

    return {
      success: true,
      stats: finalStats,
    };
  } catch (error: any) {
    console.error('Error getting thumbnail stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
