'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';
import type { MediaFilters } from '@/types/media-types';

/**
 * Get media items with pagination and filtering
 * @param filters Media filters to apply
 * @param page Current page number (1-based)
 * @param pageSize Number of items per page
 * @returns Query result with media items and count
 */
export async function getMediaItems(
  filters: MediaFilters,
  page = 1,
  pageSize = 20,
): Promise<{
  data: MediaItem[] | null;
  count: number | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  // Calculate pagination range
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Start building the query
  let query = supabase
    .from('media_items')
    .select('*, file_types!inner(*), processing_states!inner(*)', {
      count: 'exact',
    })
    .eq('file_types.ignore', false);

  // Apply text search
  if (filters.search) {
    query = query.ilike('file_name', `%${filters.search}%`);
  }

  // Apply media type filter
  if (filters.type && filters.type !== 'all') {
    query = query.eq('file_types.category', filters.type);
  }

  // Apply date range filters
  if (filters.dateFrom) {
    query = query.gte('media_date', filters.dateFrom.toISOString());
  }

  if (filters.dateTo) {
    // Add one day to include the end date fully
    const endDate = new Date(filters.dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt('media_date', endDate.toISOString());
  }

  // Apply file size filters (convert MB to bytes)
  if (filters.minSize > 0) {
    query = query.gte('size_bytes', filters.minSize * 1024 * 1024);
  }

  if (filters.maxSize < Number.MAX_SAFE_INTEGER) {
    query = query.lte('size_bytes', filters.maxSize * 1024 * 1024);
  }

  // Apply processing status filter
  if (filters.processed && filters.processed !== 'all') {
    const hasExif = filters.processed === 'yes';

    if (hasExif) {
      query = query.not('exif_data', 'is', null);
    } else {
      query = query.is('exif_data', null);
    }
  }

  // Apply camera filter
  if (filters.camera && filters.camera !== 'all' && filters.camera !== '') {
    query = query.contains('exif_data', { Image: { Model: filters.camera } });
  }

  // Apply thumbnail filter
  if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
    if (filters.hasThumbnail === 'yes') {
      query = query.not('thumbnail_path', 'is', null);
    } else {
      query = query.is('thumbnail_path', null);
    }
  }

  // Apply location filter
  if (filters.hasLocation && filters.hasLocation !== 'all') {
    if (filters.hasLocation === 'yes') {
      query = query.not('exif_data->GPS', 'is', null);
    } else {
      query = query.or('exif_data->GPS.is.null, exif_data.is.null');
    }
  }

  // Apply sorting
  let sortColumn: string;
  switch (filters.sortBy) {
    case 'name':
      sortColumn = 'file_name';
      break;
    case 'size':
      sortColumn = 'size_bytes';
      break;
    case 'type':
      sortColumn = 'file_types.category';
      break;
    default:
      sortColumn = 'media_date';
      break;
  }

  query = query.order(sortColumn, {
    ascending: filters.sortOrder === 'asc',
    nullsFirst: filters.sortOrder === 'asc',
  });

  // Add secondary sort by file name to ensure consistent ordering
  if (filters.sortBy !== 'name') {
    query = query.order('file_name', { ascending: true });
  }

  // Apply pagination
  query = query.range(from, to);

  // Execute the query
  return await query;
}
