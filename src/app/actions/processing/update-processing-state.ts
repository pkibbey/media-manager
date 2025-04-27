'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { ProgressStatus } from '@/types/progress-types';

/**
 * Update processing state for a media item
 * @param processingState The processing state to update
 * @returns Update result
 */
export async function updateProcessingState(processingState: {
  mediaItemId: string;
  status: ProgressStatus;
  type: string;
  errorMessage?: string;
}): Promise<{
  error: any | null;
}> {
  const { mediaItemId, status, type, errorMessage } = processingState;
  const supabase = createServerSupabaseClient();

  const result = await supabase.from('processing_states').upsert(
    {
      media_item_id: mediaItemId,
      type,
      status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    },
    {
      onConflict: 'media_item_id,type',
      ignoreDuplicates: false,
    },
  );

  return result;
}
