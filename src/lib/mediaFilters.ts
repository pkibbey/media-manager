import { excludeIgnoredFileTypes } from './utils';

/**
 * Filters a query to only include media files (images and videos)
 * @param query The Supabase query to filter
 * @returns The query with media filter applied
 */
export function includeMedia<
  T extends { in: (column: string, values: string[]) => T },
>(query: T): T {
  return excludeIgnoredFileTypes(
    query.in('file_types.category', ['image', 'video']),
  );
}
