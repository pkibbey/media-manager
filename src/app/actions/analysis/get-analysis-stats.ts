'use server';

import type { PostgrestError } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';
import type { UnifiedStats } from '@/types/unified-stats';

/**
 * Get statistics about image analysis processing status
 */
export async function getAnalysisStats(): Action<UnifiedStats> {
  try {
    const supabase = createServerSupabaseClient();

    // Count total media items that can be analyzed (images only)
    const { count: total, error: totalError } = await supabase
      .from('media_items')
      .select('*, file_types(category)', { count: 'exact', head: true })
      .eq('file_types.category', 'image');

    if (totalError) {
      return {
        data: null,
        error: totalError,
        count: null,
      };
    }

    // Count successful analyses
    const { count: successCount, error: successError } = await supabase
      .from('image_analysis')
      .select('*', { count: 'exact', head: true })
      .eq('processing_state', 'completed');

    if (successError) {
      return {
        data: null,
        error: successError,
        count: null,
      };
    }

    // Count failed analyses
    const { count: failedCount, error: failedError } = await supabase
      .from('image_analysis')
      .select('*', { count: 'exact', head: true })
      .eq('processing_state', 'error');

    if (failedError) {
      return {
        data: null,
        error: failedError,
        count: null,
      };
    }

    const stats: UnifiedStats = {
      counts: {
        total: total || 0,
        success: successCount || 0,
        failed: failedCount || 0,
      },
      status: 'complete',
      message: 'Analysis statistics retrieved successfully',
    };

    return {
      data: stats,
      error: null,
      count: total,
    };
  } catch (error) {
    return {
      data: null,
      error: error as PostgrestError,
      count: null,
    };
  }
}
