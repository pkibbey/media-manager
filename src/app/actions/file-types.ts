'use server';
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

    revalidatePath('/admin');

    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating file type:', error);
    return { success: false, error: error.message };
  } finally {
  }
}
