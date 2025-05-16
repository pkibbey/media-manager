import { v4 } from 'uuid';
import { setMediaAsThumbnailProcessed } from '@/actions/thumbnails/set-media-as-thumbnail-processed';
import { createSupabase } from './supabase';

interface StorageResult {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Upload thumbnail to storage and update database records
 */
export async function storeThumbnail(
  mediaId: string,
  thumbnailBuffer: Buffer,
): Promise<StorageResult> {
  const supabase = createSupabase();
  const thumbnailId = v4();
  const thumbnailFilename = `${thumbnailId}.jpg`;

  try {
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailFilename, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '31536000', // Cache for a year
      });

    if (uploadError) {
      throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
    }

    // Get public URL for the thumbnail
    const { data: urlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(thumbnailFilename);

    const thumbnailUrl = urlData.publicUrl;

    // Add the thumbnail to the thumbnail_data table
    const { error: insertError } = await supabase
      .from('thumbnail_data')
      .insert({
        id: v4(),
        created_date: new Date().toISOString(),
        media_id: mediaId,
        thumbnail_url: thumbnailUrl,
      });

    if (insertError) {
      throw new Error(
        `Failed to insert thumbnail data: ${insertError.message}`,
      );
    }

    // Update the media item status
    const { error: updateError } = await setMediaAsThumbnailProcessed(mediaId);

    if (updateError) {
      throw new Error(
        `Failed to update media item with thumbnail URL: ${updateError.message}`,
      );
    }

    return {
      success: true,
      thumbnailUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
}
