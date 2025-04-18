'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { MediaFilters } from '@/types/media-types';

/**
 * Browse media items with filters
 */
export async function browseMedia(
  filters: MediaFilters,
  page = 1,
  pageSize = 50,
) {
  try {
    const supabase = createServerSupabaseClient();
    const offset = (page - 1) * pageSize;

    // Get all file type information in a single query (for ignored types and categories)
    const { data: fileTypes, error: fileTypesError } = await supabase
      .from('file_types')
      .select('extension, category, ignore');

    if (fileTypesError) {
      console.error('Error fetching file types:', fileTypesError);
      return { success: false, error: fileTypesError.message };
    }

    // Process file types to get ignore list and categorize extensions
    const ignoredExtensions: string[] = [];
    const categorizedExtensions: Record<string, string[]> = {};

    fileTypes?.forEach((fileType) => {
      const ext = fileType.extension.toLowerCase();

      // Track ignored extensions
      if (fileType.ignore) {
        ignoredExtensions.push(ext);
      }

      // Group extensions by category
      const category = fileType.category;
      if (!categorizedExtensions[category]) {
        categorizedExtensions[category] = [];
      }
      categorizedExtensions[category].push(ext);
    });

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
      const extensions = categorizedExtensions[filters.type];
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

    if (filters.processed !== 'all') {
      query = query.eq('processed', filters.processed === 'yes');
    }

    if (filters.organized !== 'all') {
      query = query.eq('organized', filters.organized === 'yes');
    }

    if (filters.hasThumbnail !== 'all') {
      if (filters.hasThumbnail === 'yes') {
        // Filter for items that have thumbnails (not null and not starting with 'skipped:')
        query = query
          .not('thumbnail_path', 'is', null)
          .not('thumbnail_path', 'like', 'skipped:%');
      } else {
        // Filter for items without thumbnails (null or starting with 'skipped:')
        query = query.or(
          'thumbnail_path.is.null,thumbnail_path.like.skipped:%',
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

    // Get all available extensions from the file_types table (we already fetched this)
    const availableExtensions =
      fileTypes
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

/**
 * Get extensions and their counts for the filter UI
 */
export async function getExtensionCounts() {
  try {
    const supabase = createServerSupabaseClient();

    // Get all file type information in a single query
    const { data: fileTypes, error: fileTypesError } = await supabase
      .from('file_types')
      .select('extension, category, ignore');

    if (fileTypesError) {
      console.error('Error fetching file types:', fileTypesError);
      return { success: false, error: fileTypesError.message };
    }

    // Extract ignored extensions
    const ignoredExtensions =
      fileTypes
        ?.filter((type) => type.ignore)
        .map((type) => type.extension.toLowerCase()) || [];

    // Build ignore filter
    const ignoreFilter =
      ignoredExtensions.length > 0
        ? `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`
        : null;

    // Use Postgres's grouping and aggregation instead of fetching all items
    let query = supabase.from('media_items').select('extension, count()');

    // Exclude ignored file types
    if (ignoreFilter) {
      query = query.not('extension', 'in', ignoreFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching extensions:', error);
      return { success: false, error: error.message };
    }

    // Create a map of extension -> category for enriching the response
    const extensionToCategory: Record<string, string> = {};
    fileTypes?.forEach((type) => {
      extensionToCategory[type.extension.toLowerCase()] = type.category;
    });

    // Transform to expected format and ensure lowercase extensions for consistency
    const sortedExtensions = data
      .map((item) => ({
        extension: item.extension.toLowerCase(),
        count: item.count,
        // Add category information from our database mapping
        category: extensionToCategory[item.extension.toLowerCase()] || 'other',
      }))
      .sort((a, b) => b.count - a.count);

    return { success: true, data: sortedExtensions };
  } catch (error: any) {
    console.error('Error getting extension counts:', error);
    return { success: false, error: error.message };
  }
}
