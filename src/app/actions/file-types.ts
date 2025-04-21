'use server';
import { getIgnoredFileTypeIds } from '@/lib/query-helpers';
import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

/**
 * Get all file types
 */
export async function getAllFileTypes() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('file_types')
      .select('*')
      .order('extension');

    if (error) {
      console.error('Error fetching file types:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error getting file types:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a file type's properties
 */
export async function updateFileType(
  id: number,
  updates: {
    category?: string;
    mime_type?: string | null;
    can_display_natively?: boolean;
    needs_conversion?: boolean;
    ignore?: boolean;
  },
) {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('file_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating file type:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating file type:', error);
    return { success: false, error: error.message };
  } finally {
    // Revalidate paths after updating
    await revalidatePath('/admin');
    await revalidatePath('/browse');
  }
}

/**
 * Delete all file types marked as ignored from the database
 */
export async function clearIgnoredFileTypes() {
  try {
    const supabase = createServerSupabaseClient();
    const ignoredIds = await getIgnoredFileTypeIds();

    // Delete the ignored file types
    const { error: deleteError } = await supabase
      .from('file_types')
      .delete()
      .eq('ignore', true);

    if (deleteError) {
      console.error('Error deleting ignored file types:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Revalidate paths
    await revalidatePath('/admin');

    return {
      success: true,
      message: `Removed ${ignoredIds.length} ignored file types`,
    };
  } catch (error: any) {
    console.error('Error clearing ignored file types:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all file types that can be natively displayed by browsers
 * These are formats that browsers can render without conversion
 */
export async function getNativelySupportedFormats() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('file_types')
      .select('id')
      .eq('can_display_natively', true)
      .order('category');

    if (error) {
      console.error('Error fetching natively supported formats:', error);
      return { success: false, error: error.message, formats: [] };
    }

    // Return both IDs and extensions for backward compatibility during transition
    const formats = {
      ids: data.map((item) => item.id),
    };

    return { success: true, formats };
  } catch (error: any) {
    console.error('Error getting natively supported formats:', error);
    return {
      success: false,
      error: error.message,
      formats: { ids: [], extensions: [] },
    };
  }
}

/**
 * Get count of media items with missing file_type_id
 */
export async function getMissingFileTypeIdCount(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
      .from('media_items')
      .select('*', { count: 'exact' })
      .is('file_type_id', null);

    if (error) {
      console.error(
        'Error counting media items with missing file_type_id:',
        error,
      );
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error(
      'Error counting media items with missing file_type_id:',
      error,
    );
    return { success: false, error: error.message };
  }
}
