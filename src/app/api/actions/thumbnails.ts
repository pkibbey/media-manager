'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { createServerSupabaseClient } from '@/lib/supabase';
import { LARGE_FILE_THRESHOLD } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';

// Define thumbnail sizes
const THUMBNAIL_SIZE = 300; // Size for standard thumbnails

// Type for thumbnail generation errors
export type ThumbnailError = {
  path: string;
  message: string;
};

// Options for thumbnail generation
export type ThumbnailOptions = {
  skipLargeFiles?: boolean; // Whether to skip files over the large file threshold
  batchSize?: number; // Number of items to process in each batch
};

// Type for thumbnail generation result
export type ThumbnailResult = {
  success: boolean;
  message: string;
  processed?: number;
  successCount?: number;
  failedCount?: number;
  skippedLargeFiles?: number;
  currentFilePath?: string;
  filePath?: string; // Add the filePath property
  fileType?: string;
  errors?: ThumbnailError[];
};

/**
 * Ensure that the thumbnails bucket exists, creating it if necessary
 */
async function ensureThumbnailsBucketExists() {
  try {
    const supabase = createServerSupabaseClient();

    // Check if the thumbnails bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Error checking storage buckets:', error);
      return {
        success: false,
        message: `Failed to check storage buckets: ${error.message}`,
      };
    }

    // Check if the thumbnails bucket exists
    const thumbnailsBucketExists = buckets.some(
      (bucket) => bucket.name === 'thumbnails',
    );

    // Create the bucket if it doesn't exist
    if (!thumbnailsBucketExists) {
      const { error: createError } = await supabase.storage.createBucket(
        'thumbnails',
        {
          public: true, // Make bucket publicly accessible
          fileSizeLimit: 5 * 1024 * 1024, // 5MB max file size for thumbnails
        },
      );

      if (createError) {
        console.error('Error creating thumbnails bucket:', createError);
        return {
          success: false,
          message: `Failed to create thumbnails bucket: ${createError.message}`,
        };
      }

      console.log('Created thumbnails bucket successfully');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error ensuring thumbnails bucket exists:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Generate and upload a thumbnail for a single media item
 */
export async function generateThumbnail(
  mediaId: string,
  options: ThumbnailOptions = {},
): Promise<
  ThumbnailResult & {
    thumbnailUrl?: string;
    skipped?: boolean;
    skippedReason?: string;
    fileName?: string;
  }
> {
  try {
    const supabase = createServerSupabaseClient();
    const { skipLargeFiles = false } = options;

    // Get the media item details
    const { data: mediaItem, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (error || !mediaItem) {
      console.error('Error fetching media item:', error);
      return {
        success: false,
        message: `Failed to fetch media item: ${error?.message || 'Not found'}`,
        filePath: mediaId, // At least return the media ID for error tracking
      };
    }

    // Check if file exists
    try {
      await fs.access(mediaItem.file_path);
    } catch (error) {
      return {
        success: false,
        message: `File not found: ${mediaItem.file_path}`,
        filePath: mediaItem.file_path,
      };
    }

    // Check if file is too large and we should skip it
    if (skipLargeFiles) {
      try {
        const stats = await fs.stat(mediaItem.file_path);
        if (stats.size > LARGE_FILE_THRESHOLD) {
          // Mark as processed but skip thumbnail generation
          await supabase
            .from('media_items')
            .update({ thumbnail_path: 'skipped:large_file' })
            .eq('id', mediaId);

          return {
            success: true,
            skipped: true,
            skippedReason: 'large_file',
            message: `Skipped large file (over ${LARGE_FILE_THRESHOLD / (1024 * 1024)}MB): ${mediaItem.file_name}`,
            filePath: mediaItem.file_path,
            fileName: mediaItem.file_name,
          };
        }
      } catch (statError) {
        console.error(
          `Error checking file size for ${mediaItem.file_path}:`,
          statError,
        );
        // Continue with processing if we can't get the file stats
      }
    }

    // Only process images for now
    const extension = path
      .extname(mediaItem.file_path)
      .substring(1)
      .toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) {
      return {
        success: false,
        message: `File type not supported for thumbnails: ${extension}`,
        filePath: mediaItem.file_path,
        fileName: mediaItem.file_name,
        fileType: extension,
      };
    }

    // Generate thumbnail
    const thumbnailBuffer = await sharp(mediaItem.file_path)
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    // Ensure the thumbnails bucket exists
    const { success: bucketExists, message: bucketMessage } =
      await ensureThumbnailsBucketExists();
    if (!bucketExists) {
      return {
        success: false,
        message: `Failed to ensure thumbnails bucket exists: ${bucketMessage}`,
        filePath: mediaItem.file_path,
      };
    }

    // Upload to Supabase Storage
    const fileName = `${mediaId}_thumb.webp`;
    const { error: storageError } = await supabase.storage
      .from('thumbnails')
      .upload(`thumbnails/${fileName}`, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (storageError) {
      console.error('Error uploading thumbnail to storage:', storageError);
      return {
        success: false,
        message: `Failed to upload thumbnail: ${storageError.message}`,
        filePath: mediaItem.file_path,
        fileName: mediaItem.file_name,
      };
    }

    // Get the public URL for the uploaded thumbnail
    const { data: publicUrlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(`thumbnails/${fileName}`);

    const thumbnailUrl = publicUrlData.publicUrl;

    // Update the media item with the thumbnail path
    const { error: updateError } = await supabase
      .from('media_items')
      .update({ thumbnail_path: thumbnailUrl })
      .eq('id', mediaId);

    if (updateError) {
      console.error('Error updating media item:', updateError);
      return {
        success: false,
        message: `Failed to update media item: ${updateError.message}`,
        filePath: mediaItem.file_path,
        fileName: mediaItem.file_name,
      };
    }

    return {
      success: true,
      message: 'Thumbnail generated and stored successfully',
      thumbnailUrl,
      filePath: mediaItem.file_path,
      fileName: mediaItem.file_name,
      fileType: extension,
    };
  } catch (error: any) {
    console.error('Error generating thumbnail:', error);
    // Try to extract the file path from the error message if possible
    let filePath = '';
    if (error.message && typeof error.message === 'string') {
      const filePathMatch = error.message.match(
        /[/\\][^/\\]+[/\\][^/\\]+\.[a-zA-Z0-9]+/,
      );
      if (filePathMatch) {
        filePath = filePathMatch[0];
      }
    }

    return {
      success: false,
      message: `Error generating thumbnail: ${error.message}`,
      filePath,
    };
  }
}

/**
 * Batch generate thumbnails for multiple media items
 */
export async function batchGenerateThumbnails(
  mediaIds: string[],
  options: ThumbnailOptions = {},
): Promise<ThumbnailResult> {
  try {
    const { batchSize = 50, skipLargeFiles = false } = options;

    // Limit the number of items to process at once to avoid timeout
    const itemsToProcess = mediaIds.slice(0, batchSize);

    let successCount = 0;
    let failedCount = 0;
    let skippedLargeFiles = 0;
    let currentFilePath = '';
    let fileType = '';
    // Store detailed error information
    const errors: Array<{ path: string; message: string }> = [];

    // CONCURRENCY CONTROL: Process items with limited concurrency
    const CONCURRENT_LIMIT = 3; // Only process 3 thumbnails at a time
    const DELAY_BETWEEN_UPLOADS = 200; // Add a small delay (in ms) between uploads

    // Function to delay execution
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    // Process items in smaller chunks with limited concurrency
    for (let i = 0; i < itemsToProcess.length; i += CONCURRENT_LIMIT) {
      const chunk = itemsToProcess.slice(i, i + CONCURRENT_LIMIT);
      const chunkResults = await Promise.all(
        chunk.map(async (id) => {
          const result = await generateThumbnail(id, { skipLargeFiles });
          // Add a small delay after each item to prevent overwhelming the storage API
          await delay(DELAY_BETWEEN_UPLOADS);
          return result;
        }),
      );

      // Process results from this chunk
      for (let i = 0; i < chunkResults.length; i++) {
        const result = chunkResults[i];
        const id = chunk[i];
        // Track current file for UI updates
        if (result.filePath) {
          currentFilePath = result.filePath;
        }
        if (result.fileType) {
          fileType = result.fileType;
        }

        if (result.success) {
          if (result.skipped && result.skippedReason === 'large_file') {
            skippedLargeFiles++;
          } else {
            successCount++;
          }
        } else {
          failedCount++;
          // Add detailed error information
          errors.push({
            path: result.filePath || id,
            message: result.message || 'Unknown error',
          });
        }
      }
    }

    // Revalidate paths
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Generated ${successCount} thumbnails. Failed: ${failedCount}${skippedLargeFiles ? `. Skipped ${skippedLargeFiles} large files.` : ''}`,
      processed: successCount + failedCount + skippedLargeFiles,
      successCount: successCount,
      failedCount: failedCount,
      skippedLargeFiles,
      currentFilePath,
      fileType,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('Error in batch thumbnail generation:', error);
    return {
      success: false,
      message: `Error in batch processing: ${error.message}`,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      skippedLargeFiles: 0,
      errors: [
        {
          path: 'batch-process',
          message: error.message || 'Unknown batch processing error',
        },
      ],
    };
  }
}

/**
 * Generate thumbnails for all media items without thumbnails
 */
export async function generateMissingThumbnails(
  batchSize = 50,
  options: ThumbnailOptions = {},
): Promise<ThumbnailResult> {
  try {
    const supabase = createServerSupabaseClient();
    const { skipLargeFiles = false } = options;

    // Define the image file extensions we want to process
    const imageExtensions = [
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

    // Get only image files without thumbnails and their file paths for better error reporting
    const { data: mediaItems, error } = await supabase
      .from('media_items')
      .select('id, file_path, file_name, extension')
      .is('thumbnail_path', null) // Only include items with null thumbnail_path
      .in('extension', imageExtensions) // Only include image files
      .order('id', { ascending: true }) // Ensure consistent ordering for pagination
      .limit(batchSize);

    if (error) {
      return {
        success: false,
        message: `Failed to fetch media items: ${error.message}`,
        processed: 0,
        skippedLargeFiles: 0,
        successCount: 0,
        failedCount: 0,
      };
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        message: 'No image files without thumbnails found',
        processed: 0,
        skippedLargeFiles: 0,
        successCount: 0,
        failedCount: 0,
      };
    }

    // Get the first file path to show in the UI immediately
    const initialFilePath = mediaItems[0]?.file_path || '';
    const fileExtension = initialFilePath.split('.').pop()?.toLowerCase() || '';

    const mediaIds = mediaItems.map((item) => item.id);
    const result = await batchGenerateThumbnails(mediaIds, {
      batchSize,
      skipLargeFiles,
    });

    // If no current file path was set during processing, use the initial one
    if (!result.currentFilePath && initialFilePath) {
      result.currentFilePath = initialFilePath;
    }

    // If no file type was set, use the extension from the initial file
    if (!result.fileType && fileExtension) {
      result.fileType = fileExtension;
    }

    return result;
  } catch (error: any) {
    console.error('Error generating missing thumbnails:', error);
    return {
      success: false,
      message: `Error generating missing thumbnails: ${error.message}`,
      processed: 0,
      skippedLargeFiles: 0,
      successCount: 0,
      failedCount: 0,
      errors: [
        {
          path: 'missing-thumbnails',
          message:
            error.message || 'Unknown error in generateMissingThumbnails',
        },
      ],
    };
  }
}

/**
 * Reset all thumbnails by deleting them from storage and clearing thumbnail_path
 */
export async function resetAllThumbnails(): Promise<ThumbnailResult> {
  try {
    const supabase = createServerSupabaseClient();

    // 1. Count media items with thumbnails for the result message
    const { count, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true })
      .not('thumbnail_path', 'is', null);

    if (countError) {
      console.error('Error counting thumbnails:', countError);
      return {
        success: false,
        message: `Failed to count thumbnails: ${countError.message}`,
      };
    }

    // 2. Delete all files from the thumbnails bucket
    const { data: listData, error: listError } = await supabase.storage
      .from('thumbnails')
      .list('thumbnails');

    if (listError) {
      console.error('Error listing thumbnails in storage:', listError);
      return {
        success: false,
        message: `Failed to list thumbnails: ${listError.message}`,
      };
    }

    if (listData && listData.length > 0) {
      const filesToDelete = listData.map((file) => `thumbnails/${file.name}`);

      // Delete files in batches to avoid potential limits
      const batchSize = 100;
      for (let i = 0; i < filesToDelete.length; i += batchSize) {
        const batch = filesToDelete.slice(i, i + batchSize);
        const { error: deleteError } = await supabase.storage
          .from('thumbnails')
          .remove(batch);

        if (deleteError) {
          console.error('Error deleting thumbnail files:', deleteError);
          return {
            success: false,
            message: `Failed to delete thumbnails: ${deleteError.message}`,
          };
        }
      }
    }

    // 3. Clear thumbnail_path from all media items
    const { error: updateError } = await supabase
      .from('media_items')
      .update({ thumbnail_path: null })
      .filter('id', 'not.is', null); // Select all non-null IDs (all rows)

    if (updateError) {
      console.error(
        'Error resetting thumbnail paths in database:',
        updateError,
      );
      return {
        success: false,
        message: `Failed to reset thumbnail paths: ${updateError.message}`,
      };
    }

    // 4. Revalidate paths
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Successfully reset ${count || 0} thumbnails. Generate them again for your media items.`,
    };
  } catch (error: any) {
    console.error('Error resetting thumbnails:', error);
    return {
      success: false,
      message: `Error resetting thumbnails: ${error.message}`,
    };
  }
}
