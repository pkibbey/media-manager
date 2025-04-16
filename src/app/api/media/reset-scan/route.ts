import { createServerSupabaseClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

export const DELETE = async (request: NextRequest) => {
  try {
    const supabase = createServerSupabaseClient();

    // 1. First count the current number of items to report in the result
    const { count: mediaCount, error: countError } = await supabase
      .from('media_items')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting media items:', countError);
    }

    const { count: fileTypesCount, error: countTypesError } = await supabase
      .from('file_types')
      .select('*', { count: 'exact', head: true });

    if (countTypesError) {
      console.error('Error counting file types:', countTypesError);
    }

    // 2. Delete all media items (without using count in RETURNING)
    const { error: mediaError } = await supabase
      .from('media_items')
      .delete()
      .filter('id', 'not.is', null); // Select all non-null IDs (all rows)

    if (mediaError) {
      console.error('Error deleting media items:', mediaError);
      return NextResponse.json(
        {
          success: false,
          message: `Failed to delete media items: ${mediaError.message}`,
        },
        { status: 500 },
      );
    }

    // 3. Delete all file types (without using count in RETURNING)
    const { error: fileTypesError } = await supabase
      .from('file_types')
      .delete()
      .neq('id', 0);

    if (fileTypesError) {
      console.error('Error deleting file types:', fileTypesError);
      return NextResponse.json(
        {
          success: false,
          message: `Failed to delete file types: ${fileTypesError.message}`,
        },
        { status: 500 },
      );
    }

    // 4. Revalidate all relevant paths
    revalidatePath('/admin', 'layout');
    revalidatePath('/browse', 'layout');
    revalidatePath('/folders', 'layout');
    revalidatePath('/admin', 'page');
    revalidatePath('/browse', 'page');
    revalidatePath('/folders', 'page');

    return NextResponse.json({
      success: true,
      message: `Successfully reset media database. Deleted ${mediaCount || 0} media items and ${fileTypesCount || 0} file types.`,
    });
  } catch (error: any) {
    console.error('Error resetting media database:', error);
    return NextResponse.json(
      {
        success: false,
        message: `An unexpected error occurred: ${error.message}`,
      },
      { status: 500 },
    );
  }
};
