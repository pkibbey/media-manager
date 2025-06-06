'use server';

import { createSupabase } from 'shared';
import type {
  MediaFiltersType,
  MediaWithRelationsResponse,
} from 'shared/types';

/**
 * Fetch files with pagination and filtering
 */
export async function getMedia(
  filters: MediaFiltersType,
  page = 1,
  pageSize = 50,
  sortField = 'id',
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
      media_types(*),
      exif_data(*),
      analysis_data(
        adult_content,
        analysis_process,
        analysis_type,
        confidence_score,
        created_at,
        faces,
        id,
        image_description,
        keywords,
        medical_content,
        objects,
        racy_content,
        spoofed,
        tags,
        text,
        updated_at,
        violence
      )
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
      query = query.not('thumbnail_url', 'is', null);
    } else {
      query = query.is('thumbnail_url', null);
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

  if (filters.thumbnailProcess !== 'all') {
    query = query.eq('thumbnail_process', filters.thumbnailProcess);
  }

  // Execute the query and transform the result
  return query.then((result) => {
    // Transform analysis_data from array to single object to match MediaWithRelations type
    if (result.data) {
      result.data = result.data.map((media) => ({
        ...media,
        analysis_data: media.analysis_data?.[0] || null,
      })) as any;
    }
    return result as any;
  });
}
