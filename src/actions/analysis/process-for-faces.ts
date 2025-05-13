'use server';

import { getFaceRecognition } from '@/lib/analysis-models';
import { createSupabase } from '@/lib/supabase';

export async function processForFaces(mediaId: string, tier: number) {
  console.log('Checking tier ', tier);

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

  // Advanced analysis
  const faceRecognition = await getFaceRecognition();

  const faces = await faceRecognition(imageUrl);

  const endTime = Date.now(); // Record end time
  const processingTime = endTime - startTime; // Calculate processing time

  return { success: true, faces, processingTime };
}
