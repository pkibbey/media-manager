'use server';

import { createServer } from '@/lib/supabase';
import type { MediaType } from '@/types/media-types';

/**
 * Fetch all media types from the database
 */
export async function getMediaTypes(): Promise<{
  types: MediaType[] | null;
  error: unknown;
}> {
  try {
    const supabase = createServer();
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
    const supabase = createServer();
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
    const supabase = createServer();
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
