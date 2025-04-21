'use server';

import { getIgnoredFileTypeIds } from '@/lib/query-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaItem } from '@/types/db-types';
import type { MediaFilters } from '@/types/media-types';

/**
 * Browse media items with filtering and pagination
 */
export async function browseMedia(
  filters: MediaFilters,
  page = 1,
  pageSize = 20,
): Promise<{
  success: boolean;
  data?: MediaItem[];
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
  maxFileSize: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Calculate pagination range
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get ignored file type IDs for filtering out ignored files
    const ignoredIds = await getIgnoredFileTypeIds();

    // Start building the query
    let query = supabase
      .from('media_items')
      .select('*, file_types!inner(*)', { count: 'exact' });

    // Apply filters
    const ignoreFilterExpr =
      ignoredIds.length > 0 ? `(${ignoredIds.join(',')})` : '()';

    // Filter out ignored file types
    if (ignoredIds.length > 0) {
      query = query.not('file_type_id', 'in', ignoreFilterExpr);
    }

    // Text search
    if (filters.search) {
      query = query.ilike('file_name', `%${filters.search}%`);
    }

    // Media type filter
    if (filters.type && filters.type !== 'all') {
      query = query.eq('file_types.category', filters.type);
    }

    // Date range filters
    if (filters.dateFrom) {
      query = query.gte('media_date', filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      // Add one day to include the end date fully
      const endDate = new Date(filters.dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('media_date', endDate.toISOString());
    }

    // File size filters (convert MB to bytes)
    if (filters.minSize > 0) {
      query = query.gte('size_bytes', filters.minSize * 1024 * 1024);
    }

    if (filters.maxSize < Number.MAX_SAFE_INTEGER) {
      query = query.lte('size_bytes', filters.maxSize * 1024 * 1024);
    }

    // Processing status filter
    if (filters.processed && filters.processed !== 'all') {
      // We need to join with processing_states table for this filter
      const hasExif = filters.processed === 'yes';

      // For processed items, check if there's a successful exif processing state
      if (hasExif) {
        query = query.not('exif_data', 'is', null);
      } else {
        // For unprocessed items, check if exif_data is null
        query = query.is('exif_data', null);
      }
    }

    // Camera filter (from EXIF data)
    if (filters.camera && filters.camera !== 'all' && filters.camera !== '') {
      // Filter by camera model in EXIF data
      // We use PostgreSQL's JSONB query functionality
      query = query.contains('exif_data', { Image: { Model: filters.camera } });
    }

    // Location data filter
    if (filters.hasLocation && filters.hasLocation !== 'all') {
      const hasLocation = filters.hasLocation === 'yes';

      if (hasLocation) {
        // Filter items with GPS data in EXIF
        query = query.or(
          'exif_data->GPS->GPSLatitude.neq.null,exif_data->GPS->GPSLatitudeRef.neq.null',
        );
      } else {
        // Filter items without GPS data
        query = query.or(
          'exif_data->GPS->GPSLatitude.is.null,exif_data->GPS->GPSLatitudeRef.is.null,exif_data->GPS.is.null',
        );
      }
    }

    // Thumbnail filter
    if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
      // This will involve a separate query to processing_states
      const thumbQuery = supabase
        .from('processing_states')
        .select('media_item_id')
        .eq('type', 'thumbnail')
        .eq('status', 'success');

      const { data: thumbData } = await thumbQuery;
      const thumbnailMediaIds = thumbData
        ? thumbData.map((item) => item.media_item_id || '0')
        : [];

      const ignoreFilterExpr =
        ignoredIds.length > 0 ? `(${thumbnailMediaIds.join(',')})` : '()';

      if (filters.hasThumbnail === 'yes' && thumbnailMediaIds.length > 0) {
        query = query.in('id', thumbnailMediaIds);
      } else if (filters.hasThumbnail === 'no') {
        query = query.not('id', 'in', ignoreFilterExpr);
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
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching media items:', error);
      return {
        success: false,
        pagination: { page, pageSize, pageCount: 0, total: 0 },
        maxFileSize: 100,
        error: error.message,
      };
    }

    // Calculate max file size in MB - assuming we want the largest file size + some buffer
    // Default to 100MB if no files found
    const maxFileSize =
      data && data.length > 0
        ? (Math.max(...data.map((item) => item.size_bytes || 0)) /
            (1024 * 1024)) *
          1.2
        : 100;

    // Calculate page count
    const totalCount = count || 0;
    const pageCount = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        pageCount,
        total: totalCount,
      },
      maxFileSize: Math.ceil(maxFileSize), // Round up to nearest MB
    };
  } catch (error: any) {
    console.error('Exception fetching media items:', error);
    return {
      success: false,
      pagination: { page, pageSize, pageCount: 0, total: 0 },
      maxFileSize: 100,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
