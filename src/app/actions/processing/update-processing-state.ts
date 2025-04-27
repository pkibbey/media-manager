'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { ProcessingStatus } from '@/types/progress-types';

/**
 * Update processing state for a media item
 * @param processingState The processing state to update
 * @returns Update result
 */
export async function updateProcessingState(processingState: {
  media_item_id: string;
  status: ProcessingStatus;
  type: string;
  error_message?: string;
}): Promise<{
  error: any | null;
}> {
  const { media_item_id, status, type, error_message } = processingState;
  const supabase = createServerSupabaseClient();

  const result = await supabase.from('processing_states').upsert(
    {
      media_item_id,
      type,
      status,
      processed_at: new Date().toISOString(),
      error_message: error_message,
    },
    {
      onConflict: 'media_item_id,type',
      ignoreDuplicates: false,
    },
  );

 
  return result;
}
