import { createServerSupabaseClient } from './supabase';

export async function getIgnoredExtensions() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('file_types')
    .select('extension')
    .eq('ignore', true);

  return data?.map((ft) => ft.extension.toLowerCase()) || [];
}

export function createProcessingStateFilter({
  type,
  statuses,
}: { type: string; statuses: string[] }) {
  const supabase = createServerSupabaseClient();
  return supabase
    .from('processing_states')
    .select('media_item_id')
    .eq('type', type)
    .in('status', statuses);
}
