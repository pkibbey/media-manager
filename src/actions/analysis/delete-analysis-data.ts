'use server';

import { createSupabase } from '@/lib/supabase';

export default async function deleteAnalysisData() {
  const supabase = createSupabase();
  await supabase.from('analysis_data').delete().not('id', 'is', null);
  return await supabase
    .from('media')
    .update({ is_analysis_processed: false })
    .not('id', 'is', null);
}
