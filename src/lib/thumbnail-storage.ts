import { v4 } from 'uuid';
import type { TablesUpdate } from '@/types/supabase';
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

    const updateData: TablesUpdate<'media'> = {
      thumbnail_url: urlData.publicUrl,
      is_thumbnail_processed: true, // Mark as processed
    };

    // Add the thumbnail to the media table
    const { error: upsertError } = await supabase
      .from('media')
      .update(updateData)
      .eq('id', mediaId);

    if (upsertError) {
      throw new Error(
        `Failed to upsert thumbnail data: ${upsertError.message}`,
      );
    }

    return {
      success: true,
      thumbnailUrl: urlData.publicUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
}
