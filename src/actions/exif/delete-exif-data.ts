'use server';

import { createSupabase } from '@/lib/supabase';

export default async function deleteExifData() {
  const supabase = createSupabase();
  // Empty the storage bucket for EXIF data
  await supabase.from('exif_data').delete().not('id', 'is', null);

  // Delete EXIF data from the database
  return await supabase
    .from('media')
    .update({ is_exif_processed: false })
    .not('id', 'is', null);
}
