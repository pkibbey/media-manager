'use server';

import { getMediaItems } from '@/lib/query-helpers';
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
  // Use the utility function to get media items with filters and pagination
  const { data, error, count } = await getMediaItems(filters, page, pageSize);

  if (error) {
    console.error('Error fetching media items:', error);
    return {
      success: false,
      pagination: { page, pageSize, pageCount: 0, total: 0 },
      maxFileSize: 100,
      error: error.message,
    };
  }

  if (!data || data.length === 0) {
    console.warn('No media items found or all were filtered out');
    return {
      success: true,
      data: [],
      pagination: { page, pageSize, pageCount: 0, total: 0 },
      maxFileSize: 100,
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
}
