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

    // Get ignored file extensions first
    const { data: ignoredTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

    // Build query with filters
    let query = supabase.from('media_items').select('*', { count: 'exact' });

    // Exclude ignored file types
    if (ignoredExtensions.length > 0) {
      query = query.not(
        'extension',
        'in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      );
    }

    // Apply filters
    if (filters.search) {
      query = query.ilike('file_name', `%${filters.search}%`);
    }

    if (filters.type !== 'all') {
      const typeMapping: Record<string, string[]> = {
        image: [
          'jpg',
          'jpeg',
          'png',
          'gif',
          'webp',
          'avif',
          'heic',
          'tiff',
          'raw',
          'bmp',
          'svg',
        ],
        video: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'm4v'],
        data: ['json', 'xml', 'txt', 'csv', 'xmp'],
      };

      const extensions = typeMapping[filters.type];
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

    // Get max file size for the slider (convert to MB)
    let maxFileSize = 100; // Default 100MB
    const { data: sizeData, error: sizeError } = await supabase
      .from('media_items')
      .select('size_bytes')
      .order('size_bytes', { ascending: false })
      .limit(1);

    if (!sizeError && sizeData && sizeData.length > 0) {
      // Convert to MB and round up to nearest 10
      maxFileSize = Math.ceil(sizeData[0].size_bytes / (1024 * 1024) / 10) * 10;
      if (maxFileSize < 100) maxFileSize = 100; // Minimum of 100MB
    }

    // Get all available extensions
    const { data: extensionData, error: extensionError } = await supabase
      .from('file_types')
      .select('extension')
      .order('extension');

    const availableExtensions =
      !extensionError && extensionData
        ? extensionData.map((item) => item.extension)
        : [];

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

    // Get ignored file extensions first
    const { data: ignoredTypes } = await supabase
      .from('file_types')
      .select('extension')
      .eq('ignore', true);

    const ignoredExtensions =
      ignoredTypes?.map((type) => type.extension.toLowerCase()) || [];

    // Get all media items, excluding ignored extensions
    let query = supabase.from('media_items').select('extension');

    // Exclude ignored file types
    if (ignoredExtensions.length > 0) {
      query = query.not(
        'extension',
        'in',
        `(${ignoredExtensions.map((ext) => `"${ext}"`).join(',')})`,
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching extensions:', error);
      return { success: false, error: error.message };
    }

    // Count occurrences of each extension
    const extensionCounts: Record<string, number> = {};
    data.forEach((item) => {
      const ext = item.extension.toLowerCase();
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    });

    // Sort extensions by count (descending)
    const sortedExtensions = Object.entries(extensionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([extension, count]) => ({ extension, count }));

    return { success: true, data: sortedExtensions };
  } catch (error: any) {
    console.error('Error getting extension counts:', error);
    return { success: false, error: error.message };
  }
}
