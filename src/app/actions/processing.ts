'use server';

// Import the server-compatible version of processExifData directly
import { processExifData } from '@/app/actions/exif';
import { generateThumbnail } from '@/app/actions/thumbnails';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { ExtractionMethod } from '@/types/exif';
import { revalidatePath } from 'next/cache';

/**
 * Get files that failed processing
 */
export async function getFailedFiles() {
  try {
    const supabase = createServerSupabaseClient();

    // Get files that have processing errors (processed = true but exif_data is null)
    const { data, error, count } = await supabase
      .from('media_items')
      .select('id, file_name, file_path, extension, processed, error, has_exif')
      .eq('processed', true)
      .eq('has_exif', false)
      .order('file_name');

    if (error) {
      console.error('Error fetching failed files:', error);
      return {
        success: false,
        error: error.message,
        count,
      };
    }

    // Format the response
    const files = data.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_path: file.file_path,
      error: file.error,
      extension: file.extension,
    }));

    return {
      success: true,
      files,
      error: '',
      count,
    };
  } catch (error: any) {
    console.error('Error getting failed files:', error);
    return {
      success: false,
      error: error.message,
      count: 0,
    };
  }
}

/**
 * Retry processing for files that previously failed
 */
export async function retryFailedFiles(
  fileIds: string[],
  options: {
    skipLargeFiles?: boolean;
    method?: ExtractionMethod;
  } = {},
): Promise<{
  success: boolean;
  processedCount?: number;
  successCount?: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    let successCount = 0;
    let processedCount = 0;
    const { skipLargeFiles = true, method = 'default' } = options;

    // Process files one by one
    for (const fileId of fileIds) {
      try {
        // Reset processed status first
        await supabase
          .from('media_items')
          .update({
            processed: false,
            error: null,
          })
          .eq('id', fileId);

        // Process EXIF data
        const result = await processExifData({
          mediaId: fileId,
          method,
        });

        // Try to generate thumbnail if it's an image
        const { data: mediaItem } = await supabase
          .from('media_items')
          .select('extension, size_bytes')
          .eq('id', fileId)
          .single();

        if (
          mediaItem &&
          ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'heic'].includes(
            mediaItem.extension.toLowerCase(),
          )
        ) {
          await generateThumbnail(fileId, { skipLargeFiles });
        }

        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${fileId}:`, error);
        // Continue with next file
      }

      // Update progress counter (but we can't notify the client directly now)
      processedCount++;
    }

    // Revalidate relevant paths
    revalidatePath('/admin');
    revalidatePath('/browse');

    return {
      success: true,
      processedCount,
      successCount,
    };
  } catch (error: any) {
    console.error('Error retrying failed files:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
