'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get statistics about thumbnail status
 */
export async function getThumbnailStats(): Promise<{
  success: boolean;
  stats?: {
    totalCompatibleFiles: number;
    filesWithThumbnails: number;
    filesSkipped: number;
    filesPending: number;
    skippedLargeFiles: number;
  };
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get total count of all files
    const { count: totalCount, error: totalError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new Error(`Failed to get total file count: ${totalError.message}`);
    }

    // Get count of files with successful thumbnails
    const { count: withThumbnailsCount, error: withThumbnailsError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'success');

    if (withThumbnailsError) {
      throw new Error(
        `Failed to get files with thumbnails: ${withThumbnailsError.message}`,
      );
    }

    // Get count of files skipped due to being large
    const { count: skippedLargeFilesCount, error: skippedLargeFilesError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'skipped');

    if (skippedLargeFilesError) {
      throw new Error(
        `Failed to get skipped large files count: ${skippedLargeFilesError.message}`,
      );
    }

    // Get count of files with unsupported formats
    const { count: filesSkippedCount, error: filesSkippedError } =
      await supabase
        .from('processing_states')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'thumbnail')
        .eq('status', 'unsupported');

    if (filesSkippedError) {
      throw new Error(
        `Failed to get skipped files count: ${filesSkippedError.message}`,
      );
    }

    // Calculate pending files by subtracting thumbnail-having files from total
    const filesPending =
      (totalCount || 0) -
      (withThumbnailsCount || 0) -
      (filesSkippedCount || 0) -
      (skippedLargeFilesCount || 0);

    return {
      success: true,
      stats: {
        totalCompatibleFiles: totalCount || 0,
        filesWithThumbnails: withThumbnailsCount || 0,
        filesSkipped: filesSkippedCount || 0,
        filesPending: filesPending > 0 ? filesPending : 0,
        skippedLargeFiles: skippedLargeFilesCount || 0,
      },
    };
  } catch (error: any) {
    console.error('Error getting thumbnail stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
