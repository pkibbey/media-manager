'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Store analysis results in the database for a specific media item and tier
 *
 * @param mediaId - The ID of the media item being processed
 * @param tier - The processing tier (1-3) that generated these results
 * @param results - The analysis results from the tier processing
 * @returns Object with success status and any error message
 */
export async function storeAnalysisResults(
  mediaId: string,
  tier: number,
  results: any,
) {
  const supabase = createSupabase();

  try {
    // Map tier to specific analysis types
    const analysisTypes = getTierAnalysisTypes(tier);

    // Store each analysis type result
    const insertPromises = analysisTypes.map(async (type) => {
      // Only store results if we have data for this analysis type
      if (results[type]) {
        return await supabase.from('analysis_data').insert({
          media_id: mediaId,
          type: type,
          data: results[type],
          confidence_score: results[`${type}_confidence`] || null,
          tier: tier,
        });
      }
      return null;
    });

    // Wait for all database inserts to complete
    await Promise.all(insertPromises.filter(Boolean));

    // If this is the highest tier or we've completed all needed analysis,
    // mark the media item as fully processed
    if (tier === 3 || !results.shouldContinue) {
      await supabase
        .from('media')
        .update({ is_analysis_processed: true })
        .eq('id', mediaId);
    }

    return {
      success: true,
      analysisTypes: analysisTypes.filter((type) => results[type]),
    };
  } catch (error) {
    console.error('Error storing analysis results:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper function to map tier levels to specific analysis types
 *
 * @param tier - The processing tier (1-3)
 * @returns Array of analysis type strings for the given tier
 */
function getTierAnalysisTypes(tier: number): string[] {
  switch (tier) {
    case 1:
      return [
        'object_detection_basic',
        'duplicate_check',
        'quality_assessment',
      ];
    case 2:
      return ['basic_caption', 'scene_classification', 'safety_detection'];
    case 3:
      return ['detailed_caption', 'face_recognition', 'relationship_analysis'];
    default:
      return [];
  }
}
