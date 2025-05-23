import { createSupabase } from '@/lib/supabase';
import type { MediaWithThumbnail } from '@/types/media-types';

export async function saveDetectedObjects(
  mediaItem: MediaWithThumbnail,
  detectionsWithLabels: {
    label: string;
    score: number;
    box: { top: number; left: number; bottom: number; right: number };
  }[],
) {
  const supabase = createSupabase();
  return await supabase.from('analysis_data').upsert(
    {
      media_id: mediaItem.id,
      objects: detectionsWithLabels, // Store the labeled detections
    },
    { onConflict: 'media_id' },
  );
}
