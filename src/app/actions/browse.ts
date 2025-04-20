'use server';

import { PAGE_SIZE } from '@/lib/consts';
import { getFileTypeInfo } from '@/lib/file-types-utils'; // Import the new utility
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

    // Use the utility function to get file type info
    const fileTypeInfo = await getFileTypeInfo();

    if (!fileTypeInfo) {
      return { success: false, error: 'Failed to fetch file type information' };
    }

    const { ignoredExtensions, categorizedExtensions, allFileTypes } =
      fileTypeInfo;

    // Build ignore filter condition
    const ignoreFilter =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : null;

    // Build query with filters
    let query = supabase.from('media_items').select('*', { count: 'exact' });

    // Exclude ignored file types
    if (ignoreFilter) {
      query = query.not('extension', 'in', ignoreFilter);
    }

    // Apply filters
    if (filters.search) {
      query = query.ilike('file_name', `%${filters.search}%`);
    }

    if (filters.type !== 'all') {
      // Use our database-derived category mapping instead of hardcoded values
      const extensions = categorizedExtensions[filters.type]; // Use map from utility
      if (extensions && extensions.length > 0) {
        query = query.in('extension', extensions);
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

    // Updated processing filter to use processing_state
    if (filters.processed !== 'all') {
      if (filters.processed === 'yes') {
        // Items are considered processed if EXIF processing is success, skipped, or unsupported
        query = query
          .not('processing_state', 'is', null) // Ensure processing_state exists
          .in("processing_state->'exif'->>'status'", [
            'success',
            'skipped',
            'unsupported',
          ]);
      } else {
        // Not processed items are those pending, errored, outdated, or without any EXIF state
        query = query.or(
          'processing_state.is.null,' + // No processing state at all
            "processing_state->'exif'.is.null," + // No EXIF state within processing_state
            "processing_state->'exif'->>'status'.eq.pending," +
            "processing_state->'exif'->>'status'.eq.error," +
            "processing_state->'exif'->>'status'.eq.outdated",
        );
      }
    }

    // Fix the JSON query syntax for hasThumbnail filter
    if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
      if (filters.hasThumbnail === 'yes') {
        // Check for successful thumbnail processing
        query = query
          .not('processing_state', 'is', null)
          .eq("processing_state->'thumbnail'->>'status'", 'success');
      } else {
        // Check for missing or failed thumbnail processing
        query = query.or(
          'processing_state.is.null,' +
            'processing_state->thumbnail.is.null,' +
            "processing_state->'thumbnail'->>'status'.neq.success",
        );
      }
    }

    // Apply sorting
    const sortColumn = {
      date: 'media_date',
      name: 'file_name',
      size: 'size_bytes',
      type: 'extension',
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
