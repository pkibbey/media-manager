import { v4 } from 'uuid';
import { setMediaAsThumbnailProcessed } from './set-media-as-thumbnail-processed';
import type { TablesUpdate } from 'shared';
import { createSupabase } from 'shared';

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
  const thumbnailFilename = `${v4()}.jpg`;

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

    const updateObject: TablesUpdate<'media'> = {
      thumbnail_url: thumbnailUrl,
    };

    // Add the thumbnail to the media table (use update to overwrite existing data)
    const { error: upsertError } = await supabase
      .from('media')
      .update(updateObject)
      .eq('id', mediaId);

    if (upsertError) {
      throw new Error(
        `Failed to upsert thumbnail data: ${upsertError.message}`,
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
