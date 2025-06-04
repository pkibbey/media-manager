'use server';

import { createSupabase } from 'shared';
import type { TablesUpdate } from 'shared/types';

/**
 * Update a media type's properties
 */
export async function updateMediaType(
  id: string,
  updates: TablesUpdate<'media_types'>,
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
