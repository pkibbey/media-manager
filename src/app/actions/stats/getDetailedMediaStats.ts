'use server';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { DetailedMediaStats } from '@/types/media-types';

/**
 * Get detailed statistics about media items by category and extension
 * This is separated from the main stats function as it's only used in the admin stats view
 */
export async function getDetailedMediaStats(): Promise<{
  success: boolean;
  data?: DetailedMediaStats;
  error?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();

    // Get items by category using RPC
    const { data: mediaData } = await supabase.rpc('get_media_statistics');

    // Build category count map - handle undefined/non-array responses safely
    const itemsByCategory: Record<string, number> = {};
    if (mediaData && Array.isArray(mediaData)) {
      mediaData.forEach((item: any) => {
        if (item.category) {
          itemsByCategory[item.category] = item.count;
        }
      });
    }

    // Get items grouped by extension
    const { data: extensionData } = await supabase.rpc(
      'get_extension_statistics',
    );

    // Build extension count map - handle undefined/non-array responses safely
    const itemsByExtension: Record<string, number> = {};
    if (extensionData && Array.isArray(extensionData)) {
      extensionData.forEach((item: any) => {
        if (item.extension) {
          itemsByExtension[item.extension] = item.count;
        }
      });
    }

    return {
      success: true,
      data: {
        itemsByCategory,
        itemsByExtension,
      },
    };
  } catch (error) {
    console.error('Error fetching detailed media stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
