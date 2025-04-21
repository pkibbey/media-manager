'use server';

import { getDetailedFileTypeInfo } from '@/lib/file-types-utils';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Count the number of media items missing thumbnails
 */
export async function countMissingThumbnails(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get file type IDs for supported image formats
    const fileTypeInfo = await getDetailedFileTypeInfo();
    if (!fileTypeInfo) {
      throw new Error('Failed to load file type information');
    }

    // Define supported image formats and get their IDs
    const supportedImageFormats = [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'gif',
      'tiff',
      'tif',
      'heic',
      'avif',
      'bmp',
    ];

    const supportedImageIds = supportedImageFormats
      .map((ext) => fileTypeInfo.extensionToId.get(ext))
      .filter((id) => id !== undefined) as number[];

    // Get the count of items that need thumbnails - compatible items without successful/skipped processing
    const { count, error } = await supabase
      .from('media_items')
      .select('*', { count: 'exact' })
      .in('file_type_id', supportedImageIds)
      .not(
        'id',
        'in',
        supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .in('status', ['success', 'skipped']),
      );

    if (error) {
      throw new Error(`Failed to count missing thumbnails: ${error.message}`);
    }

    return {
      success: true,
      count: count || 0,
    };
  } catch (error: any) {
    console.error('Error counting missing thumbnails:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
