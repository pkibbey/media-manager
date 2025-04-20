'use server';

import { getIgnoredExtensions } from '@/lib/query-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function getExifStats() {
  try {
    const supabase = createServerSupabaseClient();

    // Get ignored file types first for consistent filtering
    const ignoredTypes = await getIgnoredExtensions();

    // Define list of supported extensions
    const exifSupportedExtensions = ['jpg', 'jpeg', 'tiff', 'heic'];

    // Generate the NOT IN filter expression for ignored extensions
    const ignoreFilterExpr =
      ignoredTypes.length > 0
        ? `(${ignoredTypes.map((ext) => `"${ext}"`).join(',')})`
        : '("")';

    // Get total count of EXIF compatible items
    const { count: totalCompatibleCount, error: totalCompatibleError } =
      await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .in('extension', exifSupportedExtensions)
        .not('extension', 'in', ignoreFilterExpr);

    if (totalCompatibleError) {
      console.error('Error with total compatible count:', totalCompatibleError);
      return { success: false, message: totalCompatibleError.message };
    }

    // Get items with successful EXIF data using the new processing_states table
    const { count: withExifCount, error: withExifError } = await supabase
      .from('processing_states')
      .select('media_item_id', { count: 'exact', head: true })
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
        .select('media_item_id', { count: 'exact', head: true })
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
      .select('id', { count: 'exact', head: true })
      .in('extension', exifSupportedExtensions)
      .not('extension', 'in', ignoreFilterExpr)
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
