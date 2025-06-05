'use server';

import { createSupabase } from 'shared';

export interface DuplicatePair {
  id: string;
  media_id: string;
  duplicate_id: string;
  similarity_score: number;
  hamming_distance: number;
  media: {
    id: string;
    thumbnail_url: string | null;
    thumbnail_process: string | null;
    media_path: string;
    size_bytes: number;
    exif_data?: {
      width: number | null;
      height: number | null;
      exif_timestamp: string | null;
      fix_date_process: string | null;
      exif_process: string | null;
    } | null;
  };
  duplicate_media: {
    id: string;
    thumbnail_url: string | null;
    thumbnail_process: string | null;
    media_path: string;
    size_bytes: number;
    exif_data?: {
      width: number | null;
      height: number | null;
      exif_timestamp: string | null;
      fix_date_process: string | null;
      exif_process: string | null;
    } | null;
  };
}

/**
 * Fetch duplicate pairs with media information
 */
export async function getDuplicatePairs(
  page = 1,
  pageSize = 20,
): Promise<{
  duplicates: DuplicatePair[];
  total: number;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();
    const offset = (page - 1) * pageSize;

    // Fetch duplicates with media information
    const {
      data: duplicates,
      error,
      count,
    } = await supabase
      .from('duplicates')
      .select(
        `
        media_id,
        duplicate_id,
        similarity_score,
        hamming_distance,
        media:media_id (
          id,
          thumbnail_url,
          thumbnail_process,
          exif_process,
          media_path,
          size_bytes,
          exif_data (
            width,
            height,
            exif_timestamp,
            fix_date_process
          )
        ),
        duplicate_media:duplicate_id (
          id,
          thumbnail_url,
          thumbnail_process,
          exif_process,
          media_path,
          size_bytes,
          exif_data (
            width,
            height,
            exif_timestamp,
            fix_date_process
          )
        )
      `,
        { count: 'exact' },
      )
      .order('similarity_score', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw error;
    }

    // Format the data with unique IDs for each row
    const formattedDuplicates: DuplicatePair[] = (duplicates || []).map(
      (dup) => ({
        id: `${dup.media_id}-${dup.duplicate_id}`,
        media_id: dup.media_id,
        duplicate_id: dup.duplicate_id,
        similarity_score: dup.similarity_score,
        hamming_distance: dup.hamming_distance,
        media: Array.isArray(dup.media) ? dup.media[0] : dup.media,
        duplicate_media: Array.isArray(dup.duplicate_media)
          ? dup.duplicate_media[0]
          : dup.duplicate_media,
      }),
    );

    return {
      duplicates: formattedDuplicates,
      total: count || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching duplicate pairs:', error);
    return {
      duplicates: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
