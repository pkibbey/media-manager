'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';

/**
 * Fetch random media items for display on the homepage
 * @param limit Number of random images to fetch (default: 5)
 */
export async function getRandomMedia(limit = 5): Promise<{
  success: boolean;
  data?: MediaItem[];
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // First, retrieve media_item IDs with successful thumbnail processing
    const { data: thumbData, error: thumbError } = await supabase
      .from('processing_states')
      .select('media_item_id')
      .eq('type', 'thumbnail')
      .eq('status', 'success');

    if (thumbError) {
      console.error('Error fetching processing states:', thumbError.message);
      return { success: false, error: thumbError.message };
    }
    const thumbnailMediaIds = thumbData
      ? thumbData.map((item) => item.media_item_id)
      : [];

    // Then, query media_items using the retrieved IDs
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .in(
        'id',
        thumbnailMediaIds.filter((id) => id !== null),
      )
      .gte('size_bytes', Math.floor(Math.random() * 50000 + 10000))
      .order('size_bytes', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching random media:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.warn('No media items found or all were filtered out');
      return { success: true, data: [] };
    }

    return { success: true, data };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error occurred';
    console.error('Exception getting random media:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
