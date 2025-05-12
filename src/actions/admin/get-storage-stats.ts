'use server';

import { createSupabase } from '@/lib/supabase';

/**
 * Get storage usage statistics from Supabase buckets
 *
 * @returns Object with storage usage statistics
 */
export async function getStorageStats() {
  try {
    const supabase = createSupabase();

    // Get list of all buckets
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      throw new Error(`Failed to list buckets: ${bucketsError.message}`);
    }

    // Default storage quota (100GB in bytes)
    const storageQuota = 100 * 1024 * 1024 * 1024;
    let totalUsedBytes = 0;

    // Get size of files in each bucket
    const bucketStats = await Promise.all(
      buckets.map(async (bucket) => {
        // List all files in the bucket to calculate size
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list();

        if (filesError) {
          console.error(
            `Error getting files for bucket ${bucket.name}:`,
            filesError,
          );
          return {
            name: bucket.name,
            size: 0,
            fileCount: 0,
          };
        }

        // Calculate size and count
        const bucketSize =
          files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) ||
          0;
        totalUsedBytes += bucketSize;

        return {
          name: bucket.name,
          size: bucketSize,
          fileCount: files?.length || 0,
        };
      }),
    );

    // Calculate percentage used
    const percentUsed = Math.round((totalUsedBytes / storageQuota) * 100);

    return {
      stats: {
        totalBytes: totalUsedBytes,
        quotaBytes: storageQuota,
        percentUsed: percentUsed,
        buckets: bucketStats,
      },
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
