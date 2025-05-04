'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';
import type { MediaFilters } from '@/types/media-types';

/**
 * Get paginated media items using the Supabase RPC function
 * @param page Page number (1-based)
 * @param pageSize Number of items per page
 * @param filters Filter options for media items
 * @returns Action result with media items array and count
 */
export async function getMediaItems({
  page = 1,
  pageSize = 20,
  filters,
}: {
  page: number;
  pageSize: number;
  filters: MediaFilters;
}) {
  const supabase = createServerSupabaseClient();

  // Convert dates to ISO strings if they exist
  const dateFrom = filters.dateFrom
    ? new Date(filters.dateFrom).toISOString()
    : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo).toISOString() : null;

  // Calculate max size in MB - replace byte conversion with direct MB value
  const maxSize = filters.maxSize < 1024 * 1024 * 4 ? filters.maxSize : null;

  // Make sure sort parameters have defined values
  const sortBy = filters.sortBy || 'created_date';
  const sortOrder = filters.sortOrder || 'desc';
  
  // Call the RPC function with all parameters
  const { data, error } = await supabase.rpc('get_media_items', {
    p_page: page,
    p_page_size: pageSize,
    p_search: filters.search,
    p_type: filters.type === 'all' ? undefined : filters.type,
    p_date_from: dateFrom || undefined,
    p_date_to: dateTo || undefined,
    p_min_size: filters.minSize || undefined,
    p_max_size: maxSize || undefined,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
    p_has_exif: filters.hasExif === 'all' ? undefined : filters.hasExif,
    p_camera: filters.camera === 'all' ? undefined : filters.camera,
    p_has_location:
      filters.hasLocation === 'all' ? undefined : filters.hasLocation,
    p_has_thumbnail:
      filters.hasThumbnail === 'all' ? undefined : filters.hasThumbnail,
  });

  if (error) {
    return { data: [], error, count: 0 };
  }

  // The RPC function returns a single row with items (JSON array) and total_count
  if (data && data.length > 0) {
    const result = data[0];
    return {
      data: result.items as MediaItem[], // Wrap result in an array
      error: null,
      count: result.total_count,
    };
  }

  return { data: [], error: null, count: 0 };
}
