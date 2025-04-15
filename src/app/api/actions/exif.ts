'use server';
import fs from 'node:fs/promises';
import { extractExifData } from '@/lib/exif-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { extractDateFromFilename } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

export async function processMediaExif(mediaId: string, filePath: string) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient();

    // Check if file exists
    await fs.access(filePath);

    // Extract EXIF data from the file
    const exifData = await extractExifData(filePath);

    if (!exifData) {
      return { success: false, message: 'No EXIF data could be extracted' };
    }

    // Prepare metadata for storage - clean up and normalize the data
    const metadata = {
      camera: {
        make: exifData.Make,
        model: exifData.Model,
        software: exifData.Software,
      },
      datetime: {
        created: exifData.CreateDate || exifData.DateTimeOriginal,
        modified: exifData.ModifyDate,
      },
      settings: {
        iso: exifData.ISO,
        shutterSpeed: exifData.ShutterSpeedValue,
        aperture: exifData.ApertureValue,
        focalLength: exifData.FocalLength,
        focalLengthIn35mm: exifData.FocalLengthIn35mmFormat,
      },
      lens: {
        make: exifData.LensMake,
        model: exifData.LensModel,
        info: exifData.LensInfo,
      },
      image: {
        width: exifData.ImageWidth,
        height: exifData.ImageHeight,
        orientation: exifData.Orientation,
      },
      location:
        exifData.latitude && exifData.longitude
          ? {
              latitude: exifData.latitude,
              longitude: exifData.longitude,
              altitude: exifData.GPSAltitude,
            }
          : null,
      copyright: exifData.Copyright,
      artist: exifData.Artist,
    };

    // Update the media record in the database - Fix: use media_items table instead of media
    const { error } = await supabase
      .from('media_items')
      .update({
        exif_data: metadata, // Fix: use exif_data column instead of metadata
        has_exif: true,
        media_date: metadata.datetime.created, // Fix: use media_date instead of capture_date
        width: metadata.image.width,
        height: metadata.image.height,
        // Note: location is stored as text in the database, so we'll omit it for now
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
      metadata,
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
      .from('media_items') // Fix: use media_items table instead of media
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

    // Get counts of media with and without EXIF data
    const { data, error } = await supabase.rpc('get_exif_stats');

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      stats: data || { with_exif: 0, without_exif: 0, total: 0 },
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
export async function processExifData(mediaId: number) {
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
    const exifData = await extractExifData(filePath);

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

    // Prepare metadata for storage - clean up and normalize the data
    const metadata = {
      camera: {
        make: exifData.Make,
        model: exifData.Model,
        software: exifData.Software,
      },
      datetime: {
        created: exifData.CreateDate || exifData.DateTimeOriginal,
        modified: exifData.ModifyDate,
      },
      settings: {
        iso: exifData.ISO,
        shutterSpeed: exifData.ShutterSpeedValue,
        aperture: exifData.ApertureValue,
        focalLength: exifData.FocalLength,
        focalLengthIn35mm: exifData.FocalLengthIn35mmFormat,
      },
      lens: {
        make: exifData.LensMake,
        model: exifData.LensModel,
        info: exifData.LensInfo,
      },
      image: {
        width: exifData.ImageWidth,
        height: exifData.ImageHeight,
        orientation: exifData.Orientation,
      },
      location:
        exifData.latitude && exifData.longitude
          ? {
              latitude: exifData.latitude,
              longitude: exifData.longitude,
              altitude: exifData.GPSAltitude,
            }
          : null,
      copyright: exifData.Copyright,
      artist: exifData.Artist,
    };

    // Update the media record in the database
    const { error } = await supabase
      .from('media_items')
      .update({
        exif_data: metadata,
        has_exif: true,
        processed: true,
        media_date: metadata.datetime.created,
        width: metadata.image.width,
        height: metadata.image.height,
        latitude: exifData.latitude,
        longitude: exifData.longitude,
      })
      .eq('id', mediaId);

    if (error) {
      console.error('Error updating media with EXIF data:', error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'EXIF data extracted and stored successfully',
      metadata,
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
