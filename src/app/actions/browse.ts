'use server';

import { PAGE_SIZE } from '@/lib/consts';
import { getDetailedFileTypeInfo } from '@/lib/file-types-utils';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaFilters } from '@/types/media-types';

/**
 * Browse media items with filters
 */
export async function browseMedia(
  filters: MediaFilters,
  page = 1,
  pageSize = PAGE_SIZE,
) {
  try {
    const supabase = createServerSupabaseClient();
    const offset = (page - 1) * pageSize;

    // Use the detailed file type info to get mapping of file type IDs by category
    const fileTypeInfo = await getDetailedFileTypeInfo();

    if (!fileTypeInfo) {
      return { success: false, error: 'Failed to fetch file type information' };
    }

    const {
      ignoredExtensions,
      categorizedExtensions,
      categoryToIds,
      allFileTypes,
    } = fileTypeInfo;

    // Build ignore filter condition
    const ignoreFilter =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : null;

    // Build query with filters
    let query = supabase.from('media_items').select('*', { count: 'exact' });

    // Exclude ignored file types - use file_type_id if available, fallback to extension
    if (fileTypeInfo.ignoredIds && fileTypeInfo.ignoredIds.length > 0) {
      // Primary approach: Filter using file_type_id (if we have IDs of ignored types)
      query = query.not('file_type_id', 'in', fileTypeInfo.ignoredIds);
    } else if (ignoreFilter) {
      // Fallback: Filter using extension
      query = query.not('extension', 'in', ignoreFilter);
    }

    // Apply filters
    if (filters.search) {
      query = query.ilike('file_name', `%${filters.search}%`);
    }

    if (filters.type !== 'all') {
      // Use file_type_id for category filtering
      const categoryIds = categoryToIds[filters.type];
      if (categoryIds && categoryIds.length > 0) {
        // Primary approach: Filter using file_type_id
        query = query.in('file_type_id', categoryIds);
      } else {
        // Fallback: Use extension-based filtering if we don't have category IDs
        const extensions = categorizedExtensions[filters.type];
        if (extensions && extensions.length > 0) {
          query = query.in('extension', extensions);
        }
      }
    }

    if (filters.dateFrom) {
      // Convert to ISO string and format for Postgres date comparison
      const dateFrom = new Date(filters.dateFrom).toISOString().split('T')[0];
      query = query.gte('media_date', dateFrom);
    }

    if (filters.dateTo) {
      // Convert to ISO string and format for Postgres date comparison
      const dateTo = new Date(filters.dateTo);
      dateTo.setDate(dateTo.getDate() + 1); // Add 1 day to include the end date
      const dateToStr = dateTo.toISOString().split('T')[0];
      query = query.lt('media_date', dateToStr);
    }

    if (filters.minSize > 0) {
      // Convert MB to bytes
      const minSizeBytes = filters.minSize * 1024 * 1024;
      query = query.gte('size_bytes', minSizeBytes);
    }

    if (filters.maxSize < Number.POSITIVE_INFINITY) {
      // Convert MB to bytes
      const maxSizeBytes = filters.maxSize * 1024 * 1024;
      query = query.lte('size_bytes', maxSizeBytes);
    }

    if (filters.processed !== 'all') {
      // We need to use subqueries or exists conditions to filter based on processing_states table
      if (filters.processed === 'yes') {
        // Items are considered processed if EXIF processing is success, skipped, or unsupported
        const processedIds = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'exif')
          .in('status', ['success', 'skipped', 'unsupported']);

        if (processedIds.error) {
          console.error('Error fetching processed items:', processedIds.error);
          return { success: false, error: processedIds.error.message };
        }

        // Filter items that have successful processing records
        if (processedIds.data && processedIds.data.length > 0) {
          const ids = processedIds.data
            .map((item) => item.media_item_id || '')
            .filter(Boolean);
          query = query.in('id', ids);
        } else {
          // If no items are processed, return empty result
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, pageCount: 0, total: 0 },
            maxFileSize: 100,
            availableExtensions: [],
          };
        }
      } else {
        // For items not processed, we need to find media items that either:
        // 1. Have no entry in processing_states for exif
        // 2. Have entries but with status pending, error, or outdated
        const nonProcessedIds = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'exif')
          .in('status', ['pending', 'error', 'outdated']);

        // Also get all media items to find those missing from processing_states
        const allMediaIds = await supabase.from('media_items').select('id');

        if (nonProcessedIds.error || allMediaIds.error) {
          console.error(
            'Error fetching unprocessed items:',
            nonProcessedIds.error || allMediaIds.error,
          );
          return {
            success: false,
            error: (nonProcessedIds.error || allMediaIds.error)?.message,
          };
        }

        // Get IDs with problematic processing status
        const problematicIds =
          nonProcessedIds.data
            ?.map((item) => item.media_item_id || '')
            .filter(Boolean) || [];

        // Find IDs that don't have an exif processing entry
        const allIds = allMediaIds.data?.map((item) => item.id) || [];
        const processedExifIds = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'exif');

        const processedIds =
          processedExifIds.data
            ?.map((item) => item.media_item_id)
            .filter(Boolean) || [];
        const missingProcessingIds = allIds.filter(
          (id) => !processedIds.includes(id),
        );

        // Combine problematic and missing processing IDs
        const unprocessedIds = [
          ...new Set([...problematicIds, ...missingProcessingIds]),
        ];

        if (unprocessedIds.length > 0) {
          query = query.in('id', unprocessedIds);
        } else {
          // If all items are processed, return empty result for "not processed" filter
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, pageCount: 0, total: 0 },
            maxFileSize: 100,
            availableExtensions: [],
          };
        }
      }
    }

    // Update hasThumbnail filter to use processing_states table
    if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
      if (filters.hasThumbnail === 'yes') {
        // Check for successful thumbnail processing
        const thumbnailIds = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .eq('status', 'success');

        if (thumbnailIds.error) {
          console.error(
            'Error fetching items with thumbnails:',
            thumbnailIds.error,
          );
          return { success: false, error: thumbnailIds.error.message };
        }

        if (thumbnailIds.data && thumbnailIds.data.length > 0) {
          const ids = thumbnailIds.data
            .map((item) => item.media_item_id || '')
            .filter(Boolean);
          query = query.in('id', ids);
        } else {
          // If no items have thumbnails, return empty result
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, pageCount: 0, total: 0 },
            maxFileSize: 100,
            availableExtensions: [],
          };
        }
      } else {
        // Find items without successful thumbnail processing
        const allMediaIds = await supabase.from('media_items').select('id');
        const successThumbnailIds = await supabase
          .from('processing_states')
          .select('media_item_id')
          .eq('type', 'thumbnail')
          .eq('status', 'success');

        if (allMediaIds.error || successThumbnailIds.error) {
          console.error('Error fetching items without thumbnails');
          return { success: false, error: 'Failed to query thumbnail status' };
        }

        const allIds = allMediaIds.data?.map((item) => item.id) || [];
        const withThumbnailIds =
          successThumbnailIds.data
            ?.map((item) => item.media_item_id)
            .filter(Boolean) || [];
        const withoutThumbnailIds = allIds.filter(
          (id) => !withThumbnailIds.includes(id),
        );

        if (withoutThumbnailIds.length > 0) {
          query = query.in('id', withoutThumbnailIds);
        } else {
          // If all items have thumbnails, return empty result for "no thumbnail" filter
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, pageCount: 0, total: 0 },
            maxFileSize: 100,
            availableExtensions: [],
          };
        }
      }
    }

    // Apply sorting
    const sortColumn = {
      date: 'media_date',
      name: 'file_name',
      size: 'size_bytes',
      type: 'extension', // Keep using extension for sorting as it's more user-friendly
    }[filters.sortBy];

    if (sortColumn) {
      query = query.order(sortColumn, {
        ascending: filters.sortOrder === 'asc',
        nullsFirst: filters.sortOrder === 'asc',
      });
    }

    // Secondary sort by id to ensure consistent ordering
    query = query.order('id', { ascending: true });

    // Add pagination
    const { data, error, count } = await query.range(
      offset,
      offset + pageSize - 1,
    );

    if (error) {
      console.error('Error fetching media items:', error);
      return { success: false, error: error.message };
    }

    // Calculate pagination info
    const pagination = {
      page,
      pageSize,
      pageCount: Math.ceil((count || 0) / pageSize),
      total: count || 0,
    };

    // Get max file size using aggregation (convert to MB)
    let maxFileSize = 100; // Default 100MB
    const { data: sizeData, error: sizeError } = await supabase
      .from('media_items')
      .select('size_bytes.max()')
      .single();

    if (!sizeError && sizeData && sizeData.max) {
      // Convert to MB and round up to nearest 10
      maxFileSize = Math.ceil(sizeData.max / (1024 * 1024) / 10) * 10;
      if (maxFileSize < 100) maxFileSize = 100; // Minimum of 100MB
    }

    // Get all available extensions from the file_types table (use data from utility)
    const availableExtensions =
      allFileTypes
        ?.filter((type) => !type.ignore) // Filter out ignored types
        .map((type) => type.extension)
        .sort() || [];

    return {
      success: true,
      data,
      pagination,
      maxFileSize,
      availableExtensions,
    };
  } catch (error: any) {
    console.error('Error browsing media items:', error);
    return { success: false, error: error.message };
  }
}
