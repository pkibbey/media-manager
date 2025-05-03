'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Get all unique camera models from the EXIF data in the database
 * @returns Array of unique camera models
 */
export async function getAvailableCameras(): Action<string[]> {
  const supabase = createServerSupabaseClient();
  
  // Query unique camera models from media_items with valid exif data
  const { data, error } = await supabase
    .rpc('get_unique_camera_models');

  if (error) {
    console.error('Error fetching camera models:', error);
    return { data: [], error };
  }

  return { data, error: null };
}