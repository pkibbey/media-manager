'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Get the maximum file size (in bytes) of all media items in the database
 * @returns The maximum file size in MB
 */
export async function getMaxFileSize(): Action<number> {
  const supabase = createServerSupabaseClient();
  
  // Query the maximum file size from media_items
  const { data, error } = await supabase
    .from('media_items')
    .select('size_bytes')
    .order('size_bytes', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching max file size:', error);
    return { data: 100, error }; // Default to 100MB if error
  }

  // Convert bytes to MB and round up
  const maxSizeMB = Math.ceil((data.size_bytes || 0) / (1024 * 1024));
  
  return { data: maxSizeMB, error: null };
}