'use server';

import { getDetailedFileTypeInfo } from '@/lib/file-types-utils';
import { getIgnoredFileTypeIds } from '@/lib/query-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function getExifStats() {
  try {
    const supabase = createServerSupabaseClient();

    // Get ignored file type IDs first for consistent filtering
    const ignoredIds = await getIgnoredFileTypeIds();

    // Get detailed file type info which includes extension-to-id mappings
    const fileTypeInfo = await getDetailedFileTypeInfo();
    if (!fileTypeInfo) {
      return {
        success: false,
        message: 'Failed to load file type information',
      };
    }

    // Find file type IDs for EXIF supported formats
    const exifSupportedExtensions = ['jpg', 'jpeg', 'tiff', 'heic'];
    const exifSupportedIds = exifSupportedExtensions
      .map((ext) => fileTypeInfo.extensionToId.get(ext))
      .filter((id) => id !== undefined) as number[];

    // Generate the NOT IN filter expression for ignored IDs
    const ignoreFilterExpr =
      ignoredIds.length > 0 ? `(${ignoredIds.join(',')})` : '()';

    // Get total count of EXIF compatible items
    const { count: totalCompatibleCount, error: totalCompatibleError } =
      await supabase
        .from('media_items')
        .select('*', { count: 'exact' })
        .in('file_type_id', exifSupportedIds)
        .not('file_type_id', 'in', ignoreFilterExpr);

    if (totalCompatibleError || totalCompatibleCount === null) {
      console.error('Error with total compatible count:', totalCompatibleError);
      return {
        success: false,
        message: totalCompatibleError?.message
          ? totalCompatibleError.message
          : 'Total compatible count is null',
      };
    }

    // Get items with successful EXIF data using the processing_states table
    const { count: withExifCount, error: withExifError } = await supabase
      .from('processing_states')
      .select('media_item_id', { count: 'exact' })
      .eq('type', 'exif')
      .eq('status', 'success');

    if (withExifError) {
      console.error('Error with exif success count:', withExifError);
      return { success: false, message: withExifError.message };
    }

    // Get items that were processed but don't have EXIF (skipped or unsupported)
    const { count: processedNoExifCount, error: processedNoExifError } =
      await supabase
        .from('processing_states')
        .select('media_item_id', { count: 'exact' })
        .eq('type', 'exif')
        .in('status', ['skipped', 'unsupported']);

    if (processedNoExifError) {
      console.error(
        'Error with processed_no_exif count:',
        processedNoExifError,
      );
      return { success: false, message: processedNoExifError.message };
    }

    // Get all media item IDs that have any processing state for EXIF
    const { data: processedMediaIds, error: processedMediaIdsError } =
      await supabase
        .from('processing_states')
        .select('media_item_id')
        .eq('type', 'exif');

    if (processedMediaIdsError) {
      console.error(
        'Error getting processed media IDs:',
        processedMediaIdsError,
      );
      return { success: false, message: processedMediaIdsError.message };
    }

    // Extract the IDs
    const processedIds = processedMediaIds.map((item) => item.media_item_id);

    // If there are no processed IDs yet, all compatible files are considered unprocessed
    let unprocessedCount = 0;

    if (processedIds.length === 0) {
      unprocessedCount = totalCompatibleCount || 0;
    } else {
      // For large number of IDs, use an alternative approach to avoid URI too long errors
      // Instead of using NOT IN with a giant list, use a LEFT JOIN and filter for NULL

      // Use RPC function if available (preferred approach)
      try {
        // Try to use a database function if it exists
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'count_unprocessed_exif_files',
          {
            exif_supported_ids: exifSupportedIds,
            ignored_ids: ignoredIds.map(Number),
          },
        );

        if (rpcError && totalCompatibleCount) {
          console.warn(
            'RPC function not available, falling back to client-side filtering:',
            rpcError,
          );
          // Fall back to manual calculation
          unprocessedCount = totalCompatibleCount - processedIds.length;
        } else if (rpcData) {
          unprocessedCount = rpcData;
        }
      } catch (rpcError) {
        console.warn('Error using RPC function:', rpcError);
        // Fall back to simply calculating the difference
        // This is an approximation but prevents URI too long errors
        unprocessedCount = totalCompatibleCount - processedIds.length;
      }
    }

    // Calculate statistics
    const withExif = withExifCount || 0;
    const processedNoExif = processedNoExifCount || 0;
    const totalExifCompatibleCount = totalCompatibleCount || 0;

    return {
      success: true,
      stats: {
        with_exif: withExif,
        processed_no_exif: processedNoExif,
        total_processed: withExif + processedNoExif,
        unprocessed: unprocessedCount,
        total: totalExifCompatibleCount,
      },
    };
  } catch (error) {
    console.error('Error fetching EXIF stats:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
