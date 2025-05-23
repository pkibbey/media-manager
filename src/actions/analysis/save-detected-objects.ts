'use server';

import { createSupabase } from '@/lib/supabase';
import type { MediaWithThumbnail } from '@/types/media-types';
import type { TablesInsert } from '@/types/supabase';

export async function saveDetectedObjects(
  mediaItem: MediaWithThumbnail,
  detectionsWithLabels: {
    label: string;
    score: number;
    box: { top: number; left: number; bottom: number; right: number };
  }[],
) {
  const supabase = createSupabase();

  const upsertObject: TablesInsert<'analysis_data'> = {
    media_id: mediaItem.id,
    objects: detectionsWithLabels, // Store the labeled detections
  };

  return await supabase
    .from('analysis_data')
    .upsert(upsertObject, { onConflict: 'media_id' });
}
