'use server';

import { createSupabase } from 'shared/supabase';
import type { MediaType } from 'shared/types';

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
      .order('mime_type', { ascending: true });

    if (error) {
      throw error;
    }

    return { types: data, error: null };
  } catch (error) {
    console.error('Error fetching media types:', error);
    return { types: null, error };
  }
}
