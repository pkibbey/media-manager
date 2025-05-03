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
    .select('*, file_types!inner(*)', {
      count: 'exact',
    })
    .eq('file_types.ignore', false);

  console.log('filters: ', filters);
  // Apply camera filter if provided
  if (filters.camera && filters.camera !== 'all') {
    query = query.eq('camera', filters.camera);
  }

  // Apply date filters if provided
  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom).toLocaleDateString();
    query = query.gte('created_date', dateFrom);
  }
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo).toLocaleDateString();
    query = query.lte('created_date', dateTo);
  }

  // Apply category filter if provided
  if (filters.type && filters.type !== 'all') {
    query = query.eq('file_types.category', filters.type);
  }

  // Apply thumbnail filter if provided
  if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
    if (filters.hasThumbnail === 'yes') {
      query = query.not('thumbnail_path', 'is', null);
    } else {
      query = query.is('thumbnail_path', null);
    }
  }

  // Apply size filters if provided
  if (filters.minSize) {
    query = query.gte('size_bytes', filters.minSize * 1024 * 1024); // Convert MB to bytes
  }

  if (filters.maxSize && filters.maxSize < 1024 * 1024 * 4) {
    query = query.lte('size_bytes', filters.maxSize);
  }

  // Apply search filter if provided
  if (filters.search) {
    const search = filters.search.toLowerCase();
    query = query.ilike('file_name', `%${search}%`);
  }

  // Apply type filter if provided
  if (filters.type && filters.type !== 'all') {
    query = query.eq('file_types.category', filters.type);
  }

  // Apply sorting
  const sortBy = filters.sortBy;
  const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  return await query;
}
