import { v4 } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { MediaWithThumbnail } from '@/types/media-types';

export async function processForObjects(mediaItem: MediaWithThumbnail) {
  // Get media URL from database
  const supabase = createSupabase();
  const startTime = Date.now(); // Record start time

  // Determine the base URL for server-side fetch
  const baseUrl = process.env.BASE_URL || 'http://localhost:4000';

  // Basic analysis
  const objectFetch = await fetch(`${baseUrl}/analysis/basic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // NOTE: we are using media_path here but we could use the thumbnail_path
    body: JSON.stringify({
      imageUrl: mediaItem.thumbnail_data?.thumbnail_url,
    }),
  });

  if (!objectFetch.ok) {
    throw new Error('Failed to fetch object data');
  }
  const objects = await objectFetch.json();
  console.log('objects: ', objects);

  const endTime = Date.now(); // Record end time
  const processingTime = endTime - startTime; // Calculate processing time

  // Upsert analysis_data record for this media_id
  const { error: upsertError } = await supabase.from('analysis_data').upsert(
    {
      id: v4(),
      media_id: mediaItem.id,
      objects,
      content_warnings: [],
    },
    { onConflict: 'media_id' },
  );

  if (upsertError) {
    throw new Error(
      `Failed to upsert analysis data: ${(upsertError as Error).message}`,
    );
  }

  // Update the media item to mark it as processed
  const { error: updateError } = await setMediaAsBasicAnalysisProcessed(
    mediaItem.id,
  );

  if (updateError) {
    throw new Error(`Failed to update media status: ${updateError.message}`);
  }

  return { success: true, processingTime };
}

function setMediaAsBasicAnalysisProcessed(mediaId: string) {
  const supabase = createSupabase();

  return supabase
    .from('media')
    .update({ is_basic_processed: true })
    .eq('id', mediaId);
}
