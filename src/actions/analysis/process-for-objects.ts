import { v4 } from 'uuid';
import { getObjectDetector } from '@/lib/analysis-models';
import { createSupabase } from '@/lib/supabase';

export async function processForObjects(mediaId: string) {
  // Get media URL from database
  const supabase = createSupabase();
  const { data: mediaData } = await supabase
    .from('media')
    .select('*, thumbnail_data(*)')
    .eq('id', mediaId)
    .single();

  const imageUrl = mediaData?.thumbnail_data?.thumbnail_url;
  if (!imageUrl) throw new Error('Image URL not found');

  const startTime = Date.now(); // Record start time

  // Basic analysis
  const objectDetector = await getObjectDetector();

  const objects = await objectDetector(imageUrl, { topk: 5 });

  const endTime = Date.now(); // Record end time
  const processingTime = endTime - startTime; // Calculate processing time

  // Check if analysis_data already exists for this media_id
  const { data: existingObject } = await supabase
    .from('analysis_data')
    .select('id')
    .eq('media_id', mediaId)
    .limit(1)
    .single();

  let insertError: unknown = null;

  if (existingObject) {
    // Update existingObject record
    ({ error: insertError } = await supabase
      .from('analysis_data')
      .update({ objects, content_warnings: [] })
      .eq('media_id', mediaId));
  } else {
    // Insert new record
    ({ error: insertError } = await supabase.from('analysis_data').insert({
      id: v4(),
      media_id: mediaId,
      objects,
      content_warnings: [],
    }));
  }

  if (insertError) {
    throw new Error(
      `Failed to insert/update analysis data: ${(insertError as Error).message}`,
    );
  }

  // Update the media item to mark it as processed
  const { error: updateError } =
    await setMediaAsBasicAnalysisProcessed(mediaId);

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
