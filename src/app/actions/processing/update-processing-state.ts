'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';
import type { ProgressStatus } from '@/types/progress-types';

/**
 * Update the processing state for a media item
 * @param mediaItemId Media item ID
 * @param progressType Type of processing
 * @param status Processing status ('success' or 'failure')
 * @param message Optional status message
 * @returns Operation result
 */
export async function updateProcessingState({
  mediaItemId,
  progressType,
  status,
  errorMessage,
}: {
  mediaItemId: string;
  progressType: string;
  status: ProgressStatus;
  errorMessage?: string;
}): Action<null> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('processing_states').upsert(
    {
      media_item_id: mediaItemId,
      type: progressType,
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'media_item_id,type',
      ignoreDuplicates: false,
    },
  );
}
