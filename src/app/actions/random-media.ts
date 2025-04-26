'use server';

import { getRandomImages } from '@/lib/query-helpers';
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
  // Use the utility function to get random media items with thumbnails
  const { data, error } = await getRandomImages(limit);

  if (error) {
    console.error('Error fetching random media:', error.message);
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    console.warn('No media items found or all were filtered out');
    return { success: true, data: [] };
  }

  return { success: true, data };
}
