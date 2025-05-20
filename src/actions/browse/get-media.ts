'use server';

import { format } from 'date-fns';
import { createSupabase } from '@/lib/supabase';
import type {
  MediaFiltersType,
  MediaWithRelationsResponse,
} from '@/types/media-types';
/**
 * Fetch files with pagination and filtering
 */
export async function getMedia(
  filters: MediaFiltersType,
  page = 1,
  pageSize = 50,
  sortField = 'created_date',
  sortDirection: 'asc' | 'desc' = 'desc',
): MediaWithRelationsResponse {
  const supabase = createSupabase();
  const offset = (page - 1) * pageSize;

  // Start building the query
  let query = supabase
    .from('media')
    .select(
      `
      *,
      media_types!inner(*),
      thumbnail_data(*),
      exif_data(*),
      analysis_data(*)
    `,
      { count: 'exact' },
    )
    .order(sortField, { ascending: sortDirection === 'asc' })
    .range(offset, offset + pageSize - 1)
    .is('media_types.is_ignored', false);

  // Apply filters
  if (!filters.includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  if (!filters.includeHidden) {
    query = query.eq('is_hidden', false);
  }

  // Filter by file type
  if (filters.category !== 'all') {
    query = query.ilike('media_types.mime_type', `${filters.category}%`);
  }

  // Date range filtering
  if (filters.dateFrom) {
    const fromDate = format(filters.dateFrom, 'yyyy-MM-dd');
    query = query.gte('created_date', fromDate);
  }

  if (filters.dateTo) {
    const toDate = format(filters.dateTo, 'yyyy-MM-dd');
    query = query.lte('created_date', toDate);
  }

  // Text search (media_path)
  if (filters.search) {
    query = query.ilike('media_path', `%${filters.search}%`);
  }

  // Has EXIF / Location / Thumbnail / Analysis filters
  if (filters.hasExif !== 'all') {
    const hasExif = filters.hasExif === 'yes';
    if (hasExif) {
      query = query.not('exif_data', 'is', null);
    } else {
      query = query.is('exif_data', null);
    }
  }

  if (filters.hasLocation !== 'all') {
    const hasLocation = filters.hasLocation === 'yes';
    if (hasLocation) {
      query = query
        .not('exif_data.gps_latitude', 'is', null)
        .not('exif_data.gps_longitude', 'is', null);
    } else {
      query = query.or(
        'exif_data.gps_latitude.is.null,exif_data.gps_longitude.is.null',
      );
    }
  }

  if (filters.hasThumbnail !== 'all') {
    const hasThumbnail = filters.hasThumbnail === 'yes';
    if (hasThumbnail) {
      query = query.not('thumbnail_data', 'is', null);
    } else {
      query = query.is('thumbnail_data', null);
    }
  }

  if (filters.hasAnalysis !== 'all') {
    const hasAnalysis = filters.hasAnalysis === 'yes';
    if (hasAnalysis) {
      query = query.not('analysis_data', 'is', null);
    } else {
      query = query.is('analysis_data', null);
    }
  }

  // Execute the query
  return await query;
}
