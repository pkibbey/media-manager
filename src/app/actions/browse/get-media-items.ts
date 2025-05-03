'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';
import type { MediaFilters } from '@/types/media-types';

/**
 * Get paginated media items for browsing
 * @param page Page number (1-based)
 * @param pageSize Number of items per page
 * @param filterCategory Optional category filter
 * @returns Query result with paginated media items
 */
export async function getMediaItems({
  page = 1,
  pageSize = 20,
  filters,
}: {
  page: number;
  pageSize: number;
  filters: MediaFilters;
}): Action<MediaItem[]> {
  const supabase = createServerSupabaseClient();
  const offset = (page - 1) * pageSize;

  // First, get file type ids that aren't ignored
  let query = supabase
    .from('media_items')
    .select('*, file_types!inner(*)', { count: 'exact' })
    .eq('file_types.ignore', false);

  // Apply category filter if provided
  if (filters?.type && filters.type !== 'all') {
    query = query.eq('file_types.category', filters.type);
  }

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  return await query;
}
