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

    // Simplify the query - first get only image media that has thumbnails
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('processed', true)
      .neq('thumbnail_path', null)
      .neq('thumbnail_path', 'skipped:large_file')
      .gte('size_bytes', Math.floor(Math.random() * 50000 + 10000))
      .order('size_bytes', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching random media:', error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      console.log('No media items found or all were filtered out');
      return { success: true, data: [] };
    }

    return { success: true, data };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error occurred';
    console.error('Exception getting random media:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
