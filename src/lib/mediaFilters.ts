import { LARGE_FILE_THRESHOLD, SMALL_FILE_THRESHOLD } from './consts';
import { excludeIgnoredFileTypes } from './utils';

/**
 * Filters a query to only include media files (images and videos)
 * This exludes files of any ignored file types
 * @param query The Supabase query to filter
 * @returns The query with media filter applied
 *
 */
export function includeMedia<
  T extends {
    in: (column: string, values: string[]) => T;
    lte: (column: string, value: number) => T;
    gte: (column: string, value: number) => T;
  },
>(query: T): T {
  return excludeIgnoredFileTypes(
    query
      // Include image and video files
      .in('file_types.category', ['image', 'video'])
      // Include files less than the large file threshold
      .lte('size_bytes', LARGE_FILE_THRESHOLD)
      // Include files greater than the small file threshold
      .gte('size_bytes', SMALL_FILE_THRESHOLD),
  );
}
