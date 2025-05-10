'use server';

import { createSupabase } from '@/lib/supabase';

interface AnalysisStats {
  total: number;
  processed: number;
  remaining: number;
  percentComplete: number;
  objectCounts: Record<string, number>;
  sceneTypes: Record<string, number>;
  settings: Record<string, number>;
  colors: Record<string, number>;
}

/**
 * Get statistics about media analysis processing
 *
 * @returns Object with analysis processing statistics
 */
export async function getAnalysisStats(): Promise<{
  stats: AnalysisStats | null;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    // Get the total count of media items
    const { count: totalCount, error: totalError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });

    console.log('totalCount: ', totalCount);
    if (totalError) {
      throw new Error(`Failed to get total count: ${totalError.message}`);
    }

    // Get count of items with processed analysis
    const { count: processedCount, error: processedError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('is_analysis_processed', true);

    console.log('processedCount: ', processedCount);

    if (processedError) {
      throw new Error(
        `Failed to get processed count: ${processedError.message}`,
      );
    }

    // Get aggregated stats from analysis_data
    const { data: analysisData, error: analysisError } = await supabase
      .from('analysis_data')
      .select('objects, scene_types, tags, colors');

    if (analysisError) {
      throw new Error(
        `Failed to get analysis results: ${analysisError.message}`,
      );
    }

    console.log('analysisData: ', analysisData);

    // Calculate object counts
    const objectCounts: Record<string, number> = {};
    const sceneTypes: Record<string, number> = {};
    const settings: Record<string, number> = {};
    const colors: Record<string, number> = {};

    // analysisData?.forEach((result) => {
    //   // Count objects
    //   result.objects?.forEach((obj: { name: string }) => {
    //     objectCounts[obj.name] = (objectCounts[obj.name] || 0) + 1;
    //   });

    //   // Count scene types
    //   result.scene_types?.forEach((scene: string) => {
    //     sceneTypes[scene] = (sceneTypes[scene] || 0) + 1;
    //   });

    //   // Count settings (from tags)
    //   result.tags?.forEach((tag: string) => {
    //     // Settings are typically "Indoor" or "Outdoor"
    //     if (['Indoor', 'Outdoor', 'Unknown'].includes(tag)) {
    //       settings[tag] = (settings[tag] || 0) + 1;
    //     }
    //   });

    //   // Count colors
    //   result.colors?.forEach((color: string) => {
    //     colors[color] = (colors[color] || 0) + 1;
    //   });
    // });

    // Calculate remaining items and percentage
    const remaining = totalCount ? totalCount - (processedCount || 0) : 0;
    const percentComplete = totalCount
      ? ((processedCount || 0) / totalCount) * 100
      : 0;

    return {
      stats: {
        total: totalCount || 0,
        processed: processedCount || 0,
        remaining,
        percentComplete: Math.round(percentComplete * 100) / 100,
        objectCounts,
        sceneTypes,
        settings,
        colors,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting analysis stats:', error);
    return {
      stats: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
