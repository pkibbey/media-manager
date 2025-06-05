'use server';

import { createSupabase } from 'shared';

/**
 * Calculate Hamming distance between two hex strings
 * @param hash1 - First hash
 * @param hash2 - Second hash
 * @returns Hamming distance (number of differing bits)
 */
function calculateHammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return -1;
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const char1 = Number.parseInt(hash1[i], 16);
    const char2 = Number.parseInt(hash2[i], 16);
    const xor = char1 ^ char2;

    // Count bits set in XOR result
    let bits = xor;
    while (bits) {
      distance += bits & 1;
      bits >>= 1;
    }
  }

  return distance;
}

/**
 * Process duplicate detection for a media item
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.visualHash - The visual hash of the media item
 * @returns Promise<boolean> - Success status
 */
export async function processDuplicates({
  mediaId,
}: {
  mediaId: string;
}): Promise<boolean> {
  const supabase = createSupabase();

  try {
    // Fetch the media item to get its visual hash
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media')
      .select('id, visual_hash')
      .eq('id', mediaId)
      .single();

    if (fetchError) {
      throw new Error(
        `Failed to fetch media item with ID ${mediaId}: ${fetchError.message}`,
      );
    }
    if (!mediaItem || !mediaItem.visual_hash) {
      console.warn(
        `Media item with ID ${mediaId} has no visual hash, skipping duplicate detection.`,
      );
      return false;
    }
    const visualHash = mediaItem.visual_hash;

    // Find potential duplicates
    const { data: similarItems, error: findError } = await supabase
      .from('media')
      .select('id, visual_hash')
      .not('id', 'eq', mediaId) // Exclude the current item
      .not('visual_hash', 'is', null)
      .is('is_deleted', false);

    if (findError) {
      throw new Error(
        `Failed to find potential duplicates: ${findError.message}`,
      );
    }

    // Calculate similarity with other items
    const potentialDuplicates = similarItems
      ?.filter((item) => item.visual_hash)
      .map((item) => {
        const distance = calculateHammingDistance(
          visualHash,
          item.visual_hash!,
        );
        return {
          mediaId: item.id,
          visualHash: item.visual_hash!,
          hammingDistance: distance,
          // Consider duplicate if hamming distance is low (adjust threshold as needed)
          isDuplicate: distance >= 0 && distance <= 10,
        };
      })
      .filter((item) => item.isDuplicate);

    // Save detection results if any duplicates are found
    if (potentialDuplicates && potentialDuplicates.length > 0) {
      const { error: upsertError } = await supabase.from('duplicates').upsert(
        potentialDuplicates.map((dup) => ({
          media_id: mediaId,
          duplicate_id: dup.mediaId,
          similarity_score: 1 - dup.hammingDistance,
          hamming_distance: dup.hammingDistance,
        })),
        { onConflict: 'media_id,duplicate_id' },
      );

      if (upsertError) {
        throw new Error(
          `Failed to save duplicates data for media ID ${mediaId}: ${upsertError.message}`,
        );
      }
    }

    return true;
  } catch (error) {
    console.error('Error processing duplicates:', error);
    throw error;
  }
}
