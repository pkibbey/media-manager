'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get all folders configured for scanning
 */
export async function getScanFolders() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('scan_folders')
      .select('*')
      .order('path');

    if (error) {
      console.error('Error getting scan folders:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting scan folders:', error);
    return { success: false, error: error.message };
  }
}
