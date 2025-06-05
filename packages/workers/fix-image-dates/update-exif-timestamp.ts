'use server';

import { createSupabase } from 'shared';

/**
 * Update the EXIF timestamp for a media item
 * Creates or updates the exif_data record with the provided timestamp
 */
export async function updateExifTimestamp(
  mediaId: string,
  timestamp: Date,
  source: 'filename_parsing' | 'file_creation_date',
): Promise<boolean> {
  try {
    const supabase = createSupabase();

    // First check if exif_data record exists
    const { data: existingExif } = await supabase
      .from('exif_data')
      .select('id, media_id')
      .eq('media_id', mediaId)
      .single();

    if (!existingExif) {
      console.log(`No existing EXIF record found for media ${mediaId}`);
      return false;
    }

    // Update existing record
    const { error: updateError } = await supabase
      .from('exif_data')
      .update({
        exif_timestamp: timestamp.toISOString(),
        fix_date_process: source,
      })
      .eq('media_id', mediaId);

    if (updateError) {
      throw updateError;
    }

    console.log(
      `Successfully updated EXIF timestamp for media ${mediaId} to ${timestamp.toISOString()}`,
    );

    return true;
  } catch (error) {
    console.error('Error updating EXIF timestamp:', error);
    return false;
  }
}
