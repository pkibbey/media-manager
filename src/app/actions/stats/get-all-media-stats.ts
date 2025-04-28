'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Get statistics about media items in the database
 * @returns Query result with media statistics
 */
export async function getAllMediaStats(): Promise<
  Action<{
    total: number;
    byCategory: { category: string; count: number }[];
    byExtension: { extension: string; count: number }[];
    totalSizeBytes: number;
  }>
> {
  const supabase = createServerSupabaseClient();

  // Get total size of all media items
  const { data: sizeData, error: sizeError } = await supabase
    .rpc('get_media_statistics')
    .single();

  // Get count by category
  const { data: categoryData, error: categoryError } = await supabase
    .from('file_types')
    .select('category, count()', { count: 'exact' });

  // Get count by file extension
  const { data: extensionData, error: extensionError } = await supabase
    .from('file_types')
    .select('extension, count()', { count: 'exact' })
    .order('count', { ascending: false });

  const hasErrors = Boolean(categoryError || extensionError || sizeError);

  if (hasErrors) {
    return {
      data: null,
      error: categoryError || extensionError || sizeError,
      count: sizeData?.total_count,
    };
  }

  return {
    data: {
      total: sizeData?.total_count || 0,
      byCategory: categoryData || [],
      byExtension: extensionData || [],
      totalSizeBytes: sizeData?.total_size_bytes || 0,
    },
    error: null,
    count: sizeData?.total_count,
  };
}
