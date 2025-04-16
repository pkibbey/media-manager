'use server';
import fs from 'node:fs/promises';
import { extractMetadata } from '@/lib/exif-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { extractDateFromFilename } from '@/lib/utils';
import type { Json } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Helper function to convert GPS coordinates from DMS format to decimal degrees
 */
function calculateGpsDecimal(
  coordinates: number[] | undefined,
  ref: string | undefined,
): number | undefined {
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
    return undefined;
  }

  // Calculate decimal degrees from degrees, minutes, seconds
  let decimal = coordinates[0] + coordinates[1] / 60 + coordinates[2] / 3600;

  // Apply negative value for South or West references
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

export async function processMediaExif(mediaId: string, filePath: string) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // Check if file exists
    await fs.access(filePath);

    // Extract EXIF data from the file
    const exifData = await extractMetadata(filePath);

    if (!exifData) {
      return { success: false, message: 'No EXIF data could be extracted' };
    }

    // Update the media record in the database
    const { error } = await supabase
      .from('media_items')
      .update({
        exif_data: exifData as Json,
        has_exif: true,
        // Use correct date property from Photo section
        media_date:
          exifData.Photo?.DateTimeOriginal?.toISOString() ||
          exifData.Image?.DateTime?.toISOString(),
        // Get dimensions from the Image section
        width: exifData.Photo?.PixelXDimension,
        height: exifData.Photo?.PixelYDimension,
      })
      .eq('id', mediaId);

    if (error) {
      console.error('Error updating media with EXIF data:', error);
      return { success: false, message: error.message };
    }

    // Revalidate relevant paths to update the UI
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath(`/media/${mediaId}`);

    return {
      success: true,
      message: 'EXIF data extracted and stored successfully',
      exifData,
    };
  } catch (error) {
    console.error('Error processing EXIF data:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function batchProcessExif(folderPath: string) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // Get all media files that don't have EXIF data yet
    const { data: mediaFiles, error } = await supabase
      .from('media_items')
      .select('id, file_path')
      .eq('has_exif', false)
      .eq('folder_path', folderPath);

    if (error) {
      return { success: false, message: error.message, processed: 0, total: 0 };
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return {
        success: true,
        message: 'No files to process',
        processed: 0,
        total: 0,
      };
    }

    // Process each media file
    let successCount = 0;
    const total = mediaFiles.length;

    for (const media of mediaFiles) {
      const result = await processMediaExif(media.id, media.file_path);
      if (result.success) {
        successCount++;
      }
    }

    // Revalidate paths
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Processed ${successCount} of ${total} files`,
      processed: successCount,
      total,
    };
  } catch (error) {
    console.error('Error in batch processing EXIF data:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      processed: 0,
      total: 0,
    };
  }
}

export async function getExifStats() {
  try {
    const supabase = createServerSupabaseClient();

    // Get count of media with EXIF data
    const { count: withExif, error: withExifError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('has_exif', true);

    // Get count of media without EXIF data
    const { count: withoutExif, error: withoutExifError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .eq('has_exif', false);

    // Get total count of media items
    const { count: total, error: totalError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    // Check for errors
    if (withExifError || withoutExifError || totalError) {
      const error = withExifError || withoutExifError || totalError;
      return { success: false, message: error?.message };
    }

    return {
      success: true,
      stats: {
        with_exif: withExif || 0,
        without_exif: withoutExif || 0,
        total: total || 0,
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

export async function processAllUnprocessedItems(count: number) {
  try {
    const supabase = createServerSupabaseClient();

    // Get all media files that don't have EXIF data yet and are not ignored file types
    const { data: fileTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      fileTypes?.map((ft) => ft.extension.toLowerCase()) || [];

    const { data: mediaFiles, error } = await supabase
      .from('media_items')
      .select('id, file_path, extension')
      .eq('has_exif', false)
      .eq('processed', false)
      .filter(
        'extension',
        'not.in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      )
      .limit(count); // Process in batches to avoid timeouts

    if (error) {
      return {
        success: false,
        message: error.message,
        processed: 0,
        total: 0,
      };
    }

    if (!mediaFiles || mediaFiles.length === 0) {
      return {
        success: true,
        message: 'No files to process',
        processed: 0,
        total: 0,
      };
    }

    // Process each media file
    let successCount = 0;
    const total = mediaFiles.length;

    for (const media of mediaFiles) {
      try {
        const result = await processMediaExif(media.id, media.file_path);

        // Even if EXIF processing fails, mark the file as processed
        await supabase
          .from('media_items')
          .update({
            processed: true,
            has_exif: result.success,
          })
          .eq('id', media.id);

        if (result.success) {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${media.file_path}:`, error);
        // Mark as processed even on error to avoid reprocessing problematic files
        await supabase
          .from('media_items')
          .update({ processed: true })
          .eq('id', media.id);
      }
    }

    // Revalidate paths
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Processed ${successCount} of ${total} files`,
      processed: successCount,
      total,
    };
  } catch (error) {
    console.error('Error processing unprocessed items:', error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
      processed: 0,
      total: 0,
    };
  }
}

/**
 * Update media dates based on filename analysis
 * This helps when EXIF data is missing or corrupt but the filename contains date information
 */
export async function updateMediaDatesFromFilenames(
  itemCount = 100,
  updateAll = false,
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  processed: number;
  updated: number;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get items with missing media_date or all items if updateAll is true
    let query = supabase
      .from('media_items')
      .select('id, file_name, media_date');

    if (!updateAll) {
      query = query.is('media_date', null);
    }

    const { data: mediaItems, error } = await query.limit(itemCount);

    if (error) {
      return {
        success: false,
        error: error.message,
        processed: 0,
        updated: 0,
      };
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        message: 'No files to process',
        processed: 0,
        updated: 0,
      };
    }

    // Process each item
    let updatedCount = 0;

    for (const item of mediaItems) {
      // Try to extract date from filename
      const extractedDate = extractDateFromFilename(item.file_name);

      if (extractedDate) {
        // Update the media date in database
        const { error: updateError } = await supabase
          .from('media_items')
          .update({
            media_date: extractedDate.toISOString(),
            // If we're updating from filename, we can also mark it as processed
            processed: true,
          })
          .eq('id', item.id);

        if (!updateError) {
          updatedCount++;
        } else {
          console.error(
            `Error updating date for ${item.file_name}:`,
            updateError,
          );
        }
      }
    }

    // Revalidate paths to update UI
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Updated dates for ${updatedCount} of ${mediaItems.length} files`,
      processed: mediaItems.length,
      updated: updatedCount,
    };
  } catch (error: any) {
    console.error('Error updating media dates from filenames:', error);
    return {
      success: false,
      error: error.message,
      processed: 0,
      updated: 0,
    };
  }
}

/**
 * Process EXIF data for a single media item by ID
 * This function is used by the batch processing implementation
 */
export async function processExifData(mediaId: string) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // First get the media item to access its file path
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media_items')
      .select('file_path')
      .eq('id', mediaId)
      .single();

    if (fetchError || !mediaItem) {
      console.error('Error fetching media item:', fetchError);
      return {
        success: false,
        message: fetchError?.message || 'Media item not found',
      };
    }

    const filePath = mediaItem.file_path;

    // Check if file exists
    await fs.access(filePath);

    // Extract EXIF data from the file
    const exifData = await extractMetadata(filePath);

    // Even if we don't get EXIF data, mark the file as processed
    if (!exifData) {
      // Update the media record to mark as processed but without EXIF
      await supabase
        .from('media_items')
        .update({
          processed: true,
          has_exif: false,
        })
        .eq('id', mediaId);

      return {
        success: false,
        message:
          'No EXIF data could be extracted, but item marked as processed',
      };
    }

    // Update the media record in the database
    const { error } = await supabase
      .from('media_items')
      .update({
        exif_data: exifData as Json,
        has_exif: true,
        processed: true,
        // Use correct date property from Photo section
        media_date:
          exifData.Photo?.DateTimeOriginal?.toISOString() ||
          exifData.Image?.DateTime?.toISOString(),
      })
      .eq('id', mediaId);

    if (error) {
      console.error('Error updating media with EXIF data:', error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'EXIF data extracted and stored successfully',
      exifData,
    };
  } catch (error) {
    console.error('Error processing EXIF data:', error);

    // Even on error, mark the item as processed to avoid retrying problematic files
    try {
      const supabase = createServerSupabaseClient();
      await supabase
        .from('media_items')
        .update({ processed: true })
        .eq('id', mediaId);
    } catch (updateError) {
      console.error('Error updating processed state:', updateError);
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
