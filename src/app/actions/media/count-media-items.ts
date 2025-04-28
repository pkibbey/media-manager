'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, MediaItem } from '@/types/db-types';

/**
 * Count media items with specific conditions
 * @param options Filter options for the count
 * @returns Count result with success status
 */
export async function countMediaItems(
  options: {
    category?: string;
    fileTypeId?: number;
    hasExif?: boolean;
    hasThumbnail?: boolean;
    includeIgnored?: boolean;
  } = {},
): Action<MediaItem[]> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('media_items')
    .select('*, file_types!inner(*)', { count: 'exact', head: true });

  // Filter by category if specified
  if (options.category) {
    query = query.eq('file_types.category', options.category);
  }

  // Filter by file type ID if specified
  if (options.fileTypeId) {
    query = query.eq('file_type_id', options.fileTypeId);
  }

  // Filter by EXIF presence if specified
  if (options.hasExif !== undefined) {
    if (options.hasExif) {
      query = query.not('exif_data', 'is', null);
    } else {
      query = query.is('exif_data', null);
    }
  }

  // Filter by thumbnail presence if specified
  if (options.hasThumbnail !== undefined) {
    if (options.hasThumbnail) {
      query = query.not('thumbnail_path', 'is', null);
    } else {
      query = query.is('thumbnail_path', null);
    }
  }

  // Exclude ignored file types unless includeIgnored is true
  if (!options.includeIgnored) {
    query = query.eq('file_types.ignore', false);
  }

  return await query;
}
