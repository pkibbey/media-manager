'use server';

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
      .order('category');

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
export async function getOrCreateMediaType(
  mimeType: string,
): Promise<string | null> {
  try {
    const supabase = createSupabase();
    const typeName = getCategoryFromMimeType(mimeType);

    const { data: existingTypes } = await supabase
      .from('media_types')
      .select('id')
      .limit(10);
    console.log('existingTypes: ', existingTypes);

    // First, check if the media type already exists
    const { data: existingType } = await supabase
      .from('media_types')
      .select('id, mime_type')
      .eq('mime_type', mimeType)
      .limit(1)
      .single();

    if (existingType) {
      // Return the existingType id
      return existingType.id;
    }

    // If not found, insert a new media type
    const typeId = uuid();
    console.log('not existingType new typeId: ', typeId);
    const { error: insertError } = await supabase.from('media_types').insert({
      id: typeId,
      category: typeName,
      mime_type: mimeType,
      type_description: `${typeName} files`,
      is_ignored: false,
      is_native: true,
    });

    if (insertError) {
      console.error('Error inserting media type:', insertError);
      return null;
    }

    return typeId;
  } catch (error) {
    console.error('Error in getOrCreateMediaType:', error);
    return null;
  }
}
