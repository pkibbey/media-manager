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

  // Save results to database
  const { error: insertError } = await supabase.from('analysis_data').upsert(
    {
      id: v4(),
      media_id: mediaId,
      objects,
      content_warnings: [],
    },
    {
      onConflict: 'media_id', // Only specify the unique column to identify the record
    },
  );

  if (insertError) {
    throw new Error(`Failed to insert EXIF data: ${insertError.message}`);
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
