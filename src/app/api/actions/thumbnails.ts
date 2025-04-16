'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';

// Define thumbnail sizes
const THUMBNAIL_SIZE = 300; // Size for standard thumbnails

/**
 * Generate and upload a thumbnail for a single media item
 */
export async function generateThumbnail(mediaId: string) {
  try {
    const supabase = createServerSupabaseClient();

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
      };
    }

    // Check if file exists
    try {
      await fs.access(mediaItem.file_path);
    } catch (error) {
      return {
        success: false,
        message: `File not found: ${mediaItem.file_path}`,
      };
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
      };
    }

    // Generate thumbnail
    const thumbnailBuffer = await sharp(mediaItem.file_path)
      .rotate()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

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
      };
    }

    return {
      success: true,
      message: 'Thumbnail generated and stored successfully',
      thumbnailUrl,
    };
  } catch (error: any) {
    console.error('Error generating thumbnail:', error);
    return {
      success: false,
      message: `Error generating thumbnail: ${error.message}`,
    };
  }
}

/**
 * Batch generate thumbnails for multiple media items
 */
export async function batchGenerateThumbnails(mediaIds: string[], limit = 50) {
  try {
    // Limit the number of items to process at once to avoid timeout
    const itemsToProcess = mediaIds.slice(0, limit);

    let successCount = 0;
    let failedCount = 0;
    const errors: Record<string, string> = {};

    // Process each item
    for (const id of itemsToProcess) {
      const result = await generateThumbnail(id);

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
        errors[id] = result.message || 'Unknown error';
      }
    }

    // Revalidate paths
    revalidatePath('/browse');
    revalidatePath('/folders');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Generated ${successCount} thumbnails. Failed: ${failedCount}`,
      processed: successCount + failedCount,
      successful: successCount,
      failed: failedCount,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('Error in batch thumbnail generation:', error);
    return {
      success: false,
      message: `Error in batch processing: ${error.message}`,
      processed: 0,
      successful: 0,
      failed: 0,
    };
  }
}

/**
 * Generate thumbnails for all media items without thumbnails
 */
export async function generateMissingThumbnails(batchSize = 50) {
  try {
    const supabase = createServerSupabaseClient();

    // Get media items without thumbnails
    const { data: mediaItems, error } = await supabase
      .from('media_items')
      .select('id')
      .is('thumbnail_path', null)
      .limit(batchSize);

    if (error) {
      return {
        success: false,
        message: `Failed to fetch media items: ${error.message}`,
        processed: 0,
      };
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        message: 'No media items without thumbnails found',
        processed: 0,
      };
    }

    const mediaIds = mediaItems.map((item) => item.id);
    return await batchGenerateThumbnails(mediaIds, batchSize);
  } catch (error: any) {
    console.error('Error generating missing thumbnails:', error);
    return {
      success: false,
      message: `Error generating missing thumbnails: ${error.message}`,
      processed: 0,
    };
  }
}

/**
 * Reset all thumbnails by deleting them from storage and clearing thumbnail_path
 */
export async function resetAllThumbnails() {
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
