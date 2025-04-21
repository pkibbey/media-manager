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
      ignoredIds.length > 0 ? `(${ignoredIds.join(',')})` : '(0)';

    // Get total count of EXIF compatible items
    const { count: totalCompatibleCount, error: totalCompatibleError } =
      await supabase
        .from('media_items')
        .select('*', { count: 'exact' })
        .in('file_type_id', exifSupportedIds)
        .not('file_type_id', 'in', ignoreFilterExpr);

    if (totalCompatibleError) {
      console.error('Error with total compatible count:', totalCompatibleError);
      return { success: false, message: totalCompatibleError.message };
    }

    // Get items with successful EXIF data using the new processing_states table
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

    // Get count of unprocessed items (no processing state entry for exif)
    const { count: unprocessedCount, error: unprocessedError } = await supabase
      .from('media_items')
      .select('id', { count: 'exact' })
      .in('file_type_id', exifSupportedIds)
      .not('file_type_id', 'in', ignoreFilterExpr)
      .not(
        'id',
        'in',
        supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'exif'),
      );

    if (unprocessedError) {
      console.error('Error with unprocessed count:', unprocessedError);
      return { success: false, message: unprocessedError.message };
    }

    // Calculate statistics
    const withExif = withExifCount || 0;
    const processedNoExif = processedNoExifCount || 0;
    const unprocessedCount2 = unprocessedCount || 0;
    const totalExifCompatibleCount = totalCompatibleCount || 0;

    return {
      success: true,
      stats: {
        with_exif: withExif,
        processed_no_exif: processedNoExif,
        total_processed: withExif + processedNoExif,
        unprocessed: unprocessedCount2,
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
