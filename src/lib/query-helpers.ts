import { createServerSupabaseClient } from './supabase';

/**
 * Get the IDs of file types marked as ignored
 * @returns Array of file type IDs
 */
export async function getIgnoredFileTypeIds() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('file_types')
    .select('id')
    .eq('ignore', true);

  return data?.map((ft) => ft.id.toString()) || [];
}

/**
 * @deprecated Use getIgnoredFileTypeIds instead
 * Legacy function for backward compatibility during transition
 */
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
}: {
  type: string;
  statuses: string[];
}) {
  const supabase = createServerSupabaseClient();
  return supabase
    .from('processing_states')
    .select('media_item_id, status')
    .eq('type', type)
    .in('status', statuses);
}
