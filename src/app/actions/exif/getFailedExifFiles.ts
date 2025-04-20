'use server';

import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Get files that failed EXIF data extraction
 */
export async function getFailedExifFiles() {
  try {
    const supabase = createServerSupabaseClient();

    // Get files that have errors in EXIF processing using the processing_states table
    // Note: Using !inner join might return an array for processing_states
    const { data, error } = await supabase
      .from('media_items')
      .select(`
        id, 
        file_name, 
        file_path, 
        extension, 
        size_bytes,
        processing_states!inner(status, error_message)
      `)
      .eq('processing_states.type', 'exif')
      .eq('processing_states.status', 'error')
      .order('file_name');

    if (error) {
      console.error('Error fetching failed EXIF files:', error);
      return {
        success: false,
        error: error.message,
        message: 'Error fetching failed EXIF files',
      };
    }

    // Format the response, accessing the first element of the processing_states array
    const files = data.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_path: file.file_path,
      // Access the first element since !inner join returns an array
      error: file.processing_states[0]?.error_message || 'Unknown error',
      extension: file.extension,
      size_bytes: file.size_bytes,
    }));

    return {
      success: true,
      files,
      message: 'Failed EXIF files fetched successfully',
    };
  } catch (error: any) {
    console.error('Error getting failed EXIF files:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
