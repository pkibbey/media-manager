'use server';

import fs from 'node:fs/promises';
import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Add a new folder to be scanned for media files
 */
export async function addScanFolder(
  folderPath: string,
  includeSubfolders = true,
) {
  try {
    const supabase = createServerSupabaseClient();

    // Check if folder exists
    try {
      await fs.access(folderPath);
    } catch (error) {
      console.error('Folder does not exist or is not accessible:', error);
      return {
        success: false,
        error: 'Folder path does not exist or is not accessible',
      };
    }

    // Check if folder is already in database
    const { data: existingFolder } = await supabase
      .from('scan_folders')
      .select('id')
      .eq('path', folderPath)
      .maybeSingle();

    if (existingFolder) {
      return { success: false, error: 'Folder is already added to scan list' };
    }

    // Add folder to database
    const { data, error } = await supabase
      .from('scan_folders')
      .insert({
        path: folderPath,
        include_subfolders: includeSubfolders,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding scan folder:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');

    return { success: true, data };
  } catch (error: any) {
    console.error('Error adding scan folder:', error);
    return { success: false, error: error.message };
  }
}
