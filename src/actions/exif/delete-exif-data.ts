'use server';

import { createSupabase } from '@/lib/supabase';

export default async function deleteExifData() {
  const supabase = createSupabase();
  await supabase.from('exif_data').delete().not('id', 'is', null);
  return await supabase
    .from('media')
    .update({ exif_processed: false })
    .not('id', 'is', null);
}
