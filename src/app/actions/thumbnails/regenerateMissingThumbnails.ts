'use server';

import { getDetailedFileTypeInfo } from '@/lib/file-types-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateThumbnail } from './generateThumbnail';

/**
 * Regenerate missing thumbnails (non-streaming batch version)
 */
export async function regenerateMissingThumbnails(): Promise<{
  success: boolean;
  message: string;
  count?: number;
}> {
  try {
    const supabase = createServerSupabaseClient();
    let processed = 0;
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

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

    // Get items that need thumbnails using processing_states table
    const { data: items, error } = await supabase
      .from('media_items')
      .select('id')
      .in('file_type_id', supportedImageIds)
      .not(
        'id',
        'in',
        supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .in('status', ['success', 'skipped']),
      )
      .or(
        `id.in.(${supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .eq('status', 'error')})`,
      )
      .limit(100); // Limit to a reasonable batch size

    if (error) {
      throw new Error(`Error fetching media items: ${error.message}`);
    }

    if (!items || items.length === 0) {
      return {
        success: true,
        message: 'No missing thumbnails to regenerate',
        count: 0,
      };
    }

    // Process each item
    for (const item of items) {
      try {
        const result = await generateThumbnail(item.id, {
          skipLargeFiles: true,
        });

        processed++;

        if (result.skipped) {
          skippedCount++;
        } else if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (itemError) {
        failedCount++;
        processed++;
        console.error(
          `Error regenerating thumbnail for ${item.id}:`,
          itemError,
        );
      }
    }

    return {
      success: true,
      message: `Regenerated ${successCount} thumbnails (${failedCount} failed, ${skippedCount} skipped)`,
      count: processed,
    };
  } catch (error: any) {
    console.error('Error regenerating thumbnails:', error);
    return {
      success: false,
      message: `Failed to regenerate thumbnails: ${error.message}`,
    };
  }
}
