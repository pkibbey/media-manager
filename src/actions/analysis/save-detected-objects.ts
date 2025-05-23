'use server';

import { createSupabase } from '@/lib/supabase';
import type { DetectedObjectType } from '@/types/analysis';
import type { MediaWithThumbnail } from '@/types/media-types';
import type { TablesInsert } from '@/types/supabase';

export async function saveDetectedObjects(
  mediaItem: MediaWithThumbnail,
  detections: DetectedObjectType[],
) {
  const supabase = createSupabase();

  const upsertObject: TablesInsert<'analysis_data'> = {
    media_id: mediaItem.id,
    objects: detections, // Store the original COCO-SSD format
  };

  return await supabase
    .from('analysis_data')
    .upsert(upsertObject, { onConflict: 'media_id' });
}
