'use server';

import fs from 'node:fs/promises';
import fileTypeChecker from 'file-type-checker';
import { v4 as uuid } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { MediaType } from '@/types/media-types';

/**
 * Fetch all media types from the database
 */
export async function getMediaTypes(): Promise<{
  types: MediaType[] | null;
  error: unknown;
}> {
  try {
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from('media_types')
      .select('*')
      .order('type_name');

    if (error) {
      throw error;
    }

    return { types: data, error: null };
  } catch (error) {
    console.error('Error fetching media types:', error);
    return { types: null, error };
  }
}

/**
 * Update a media type's properties
 */
export async function updateMediaType(
  id: string,
  updates: Partial<MediaType>,
): Promise<{ success: boolean; error: unknown }> {
  try {
    const supabase = createSupabase();
    const { error } = await supabase
      .from('media_types')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating media type:', error);
    return { success: false, error };
  }
}

/**
 * Delete a media type
 * Note: This will fail if there are media items using this type
 */
export async function deleteMediaType(
  id: string,
): Promise<{ success: boolean; error: unknown }> {
  try {
    const supabase = createSupabase();
    const { error } = await supabase.from('media_types').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting media type:', error);
    return { success: false, error };
  }
}

/**
 * Convert a MIME type to a general media type category
 */
function getCategoryFromMimeType(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (
    mimeType.startsWith('text/') ||
    mimeType.startsWith('application/pdf') ||
    mimeType.startsWith('application/msword') ||
    mimeType.includes('document')
  ) {
    return 'document';
  }

  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  return 'other';
}

/**
 * Get or create a media type in the database
 */
async function getOrCreateMediaType(mimeType: string): Promise<string | null> {
  try {
    const supabase = createSupabase();
    const typeName = getCategoryFromMimeType(mimeType);

    // Generate an ID for the potential new record
    const typeId = uuid();

    // Perform the upsert operation
    const { error, data } = await supabase.from('media_types').upsert(
      {
        id: typeId,
        type_name: typeName,
        mime_type: mimeType,
        type_description: `${typeName} files`,
        is_ignored: false,
        is_native: true,
      },
      {
        onConflict: 'mime_type', // mime_type is unique
      },
    );

    // 23505 is the unique violation error code in PostgreSQL
    if (error && error.code !== '23505') {
      return null;
    }

    console.error('Error upserting media type:', error, data);

    // After upsert, query to get the ID (could be the new ID or existing one)
    const { data: mediaType } = await supabase
      .from('media_types')
      .select('id')
      .eq('mime_type', mimeType)
      .single();

    return mediaType?.id || null;
  } catch (error) {
    console.error('Error in getOrCreateMediaType:', error);
    return null;
  }
}

/**
 * Detect the MIME type from file buffer
 */
async function detectMimeTypeFromPath(
  filePath: string,
): Promise<string | null> {
  try {
    const buffer = await fs.readFile(filePath);
    const type = fileTypeChecker.detectFile(buffer);
    if (type) {
      return type.mimeType;
    }
    return null;
  } catch (error) {
    console.error(`Error detecting MIME type for ${filePath}:`, error);
    return null;
  }
}

/**
 * Refresh all image media types using the latest file type detection
 * This will scan all files currently classified as images and update their media type
 * without changing other media data.
 */
export async function refreshImageMediaTypes(): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  newTypes: number;
  error?: string;
}> {
  try {
    const supabase = createSupabase();

    // Get all media items with image types
    const { data: imageMediaTypes } = await supabase
      .from('media_types')
      .select('id')
      .eq('type_name', 'image');

    if (!imageMediaTypes || imageMediaTypes.length === 0) {
      return {
        success: false,
        processed: 0,
        updated: 0,
        newTypes: 0,
        error: 'No image media types found',
      };
    }

    const imageTypeIds = imageMediaTypes.map((type) => type.id);

    // Get all media items with these types
    const { data: mediaItems, error: mediaFetchError } = await supabase
      .from('media')
      .select('*')
      .in('media_type_id', imageTypeIds);

    if (mediaFetchError) {
      throw new Error(
        `Failed to fetch media items: ${mediaFetchError.message}`,
      );
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        processed: 0,
        updated: 0,
        newTypes: 0,
        error: 'No image files found to process',
      };
    }

    let processed = 0;
    let updated = 0;
    let newTypes = 0;

    // Process each media item
    for (const item of mediaItems) {
      processed++;

      // Re-analyze the file with the file-type-checker
      const newMimeType = await detectMimeTypeFromPath(item.media_path);

      if (!newMimeType) {
        console.warn(`Could not detect MIME type for ${item.media_path}`);
        continue;
      }

      // Get or create the media type
      const typeId = await getOrCreateMediaType(newMimeType);

      if (!typeId) {
        console.error(`Failed to get/create media type for ${newMimeType}`);
        continue;
      }

      // Check if this is a new type
      if (!imageTypeIds.includes(typeId)) {
        newTypes++;
      }

      // Only update if the type has changed
      if (item.media_type_id !== typeId) {
        // Update the media item with the new media type ID
        const { error: updateError } = await supabase
          .from('media')
          .update({ media_type_id: typeId })
          .eq('id', item.id);

        if (updateError) {
          console.error(
            `Failed to update media item ${item.id}:`,
            updateError.message,
          );
          continue;
        }

        updated++;
      }
    }

    return {
      success: true,
      processed,
      updated,
      newTypes,
    };
  } catch (error) {
    console.error('Error refreshing image media types:', error);
    return {
      success: false,
      processed: 0,
      updated: 0,
      newTypes: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Refresh all media types in batches regardless of current status
 * Uses file-type-checker to accurately determine each file's type
 */
export async function refreshAllMediaTypes(batchSize = 50): Promise<{
  success: boolean;
  processed: number;
  updated: number;
  newTypes: number;
  error?: string;
  batchesCompleted: number;
  totalBatches: number;
}> {
  try {
    const supabase = createSupabase();
    let processed = 0;
    let updated = 0;
    let newTypes = 0;
    let batchesCompleted = 0;
    let hasMore = true;
    let page = 0;

    // First, get the total count of media items
    const { count, error: countError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to get media count: ${countError.message}`);
    }

    const totalItems = count || 0;
    const totalBatches = Math.ceil(totalItems / batchSize);

    // Process media items in batches
    while (hasMore) {
      // Fetch a batch of media items
      const { data: mediaItems, error: fetchError } = await supabase
        .from('media')
        .select('*')
        .range(page * batchSize, (page + 1) * batchSize - 1);

      if (fetchError) {
        throw new Error(`Failed to fetch media items: ${fetchError.message}`);
      }

      if (!mediaItems || mediaItems.length === 0) {
        hasMore = false;
        break;
      }

      // Keep track of types we find to check for new ones
      const existingTypeIds = new Set<string>();
      mediaItems.forEach((item) => {
        if (item.media_type_id) {
          existingTypeIds.add(item.media_type_id);
        }
      });

      // Process each media item in the current batch
      for (const item of mediaItems) {
        processed++;

        // Re-analyze the file with the file-type-checker
        const newMimeType = await detectMimeTypeFromPath(item.media_path);

        if (!newMimeType) {
          console.warn(`Could not detect MIME type for ${item.media_path}`);
          continue;
        }

        // Get or create the media type
        const typeId = await getOrCreateMediaType(newMimeType);

        if (!typeId) {
          console.error(`Failed to get/create media type for ${newMimeType}`);
          continue;
        }

        // Check if this is a new type
        if (!existingTypeIds.has(typeId)) {
          newTypes++;
        }

        // Only update if the type has changed
        if (item.media_type_id !== typeId) {
          // Update the media item with the new media type ID
          const { error: updateError } = await supabase
            .from('media')
            .update({ media_type_id: typeId })
            .eq('id', item.id);

          if (updateError) {
            console.error(
              `Failed to update media item ${item.id}:`,
              updateError.message,
            );
            continue;
          }

          updated++;
        }
      }

      batchesCompleted++;
      page++;
    }

    return {
      success: true,
      processed,
      updated,
      newTypes,
      batchesCompleted,
      totalBatches,
    };
  } catch (error) {
    console.error('Error refreshing media types:', error);
    return {
      success: false,
      processed: 0,
      updated: 0,
      newTypes: 0,
      batchesCompleted: 0,
      totalBatches: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
