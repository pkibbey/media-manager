'use server';

import { createSupabase } from '@/lib/supabase';
import type { MediaWithRelations } from '@/types/media-types';

export interface DuplicateGroup {
  hash: string;
  items: MediaWithRelations[];
  similarity: 'exact' | 'high' | 'medium';
  hammingDistance?: number;
}

export interface DuplicatesResult {
  groups: DuplicateGroup[];
  stats: {
    totalGroups: number;
    totalDuplicateItems: number;
    exactMatches: number;
    similarMatches: number;
  };
  error?: string;
}

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
 * Categorize similarity based on Hamming distance
 * @param distance - Hamming distance
 * @param totalBits - Total number of bits in hash
 * @returns Similarity category
 */
function categorizeSimilarity(
  distance: number,
  totalBits: number,
): 'exact' | 'high' | 'medium' {
  if (distance === 0) return 'exact';

  const percentage = (distance / totalBits) * 100;

  if (percentage <= 10) return 'high';
  if (percentage <= 25) return 'medium';

  return 'medium'; // We'll filter out anything beyond medium similarity
}

/**
 * Find potential duplicate images based on visual hash comparison
 * @param maxHammingDistance - Maximum Hamming distance to consider as similar (default: 10)
 * @returns Groups of potentially duplicate images
 */
export async function getDuplicates(
  maxHammingDistance = 10,
): Promise<DuplicatesResult> {
  try {
    const supabase = createSupabase();

    // Get all media items that have visual hashes and are images
    const { data: mediaItems, error } = await supabase
      .from('media')
      .select(`
        *,
        media_types!inner(*),
        exif_data(*),
        analysis_data(*)
      `)
      .not('visual_hash', 'is', null)
      .ilike('media_types.mime_type', '%image%')
      .is('media_types.is_ignored', false)
      .is('is_deleted', false)
      .order('visual_hash');

    if (error) {
      throw new Error(`Failed to fetch media items: ${error.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        groups: [],
        stats: {
          totalGroups: 0,
          totalDuplicateItems: 0,
          exactMatches: 0,
          similarMatches: 0,
        },
      };
    }

    console.log(
      `[getDuplicates] Analyzing ${mediaItems.length} items for duplicates`,
    );

    // Find duplicates using hash comparison
    const duplicateGroups: Map<string, MediaWithRelations[]> = new Map();
    const similarGroups: Map<
      string,
      { items: MediaWithRelations[]; distance: number }[]
    > = new Map();
    const processedHashes = new Set<string>();

    // First pass: find exact matches
    for (const item of mediaItems) {
      const hash = item.visual_hash!;

      if (!duplicateGroups.has(hash)) {
        duplicateGroups.set(hash, []);
      }
      duplicateGroups.get(hash)!.push(item);
    }

    // Second pass: find similar matches for items that don't have exact duplicates
    for (let i = 0; i < mediaItems.length; i++) {
      const item1 = mediaItems[i];
      const hash1 = item1.visual_hash!;

      // Skip if this hash already has exact duplicates
      if (duplicateGroups.get(hash1)!.length > 1) {
        continue;
      }

      if (processedHashes.has(hash1)) {
        continue;
      }

      const similarItems: { item: MediaWithRelations; distance: number }[] = [];

      for (let j = i + 1; j < mediaItems.length; j++) {
        const item2 = mediaItems[j];
        const hash2 = item2.visual_hash!;

        // Skip if this hash already has exact duplicates
        if (duplicateGroups.get(hash2)!.length > 1) {
          continue;
        }

        if (hash1 === hash2) continue;

        const distance = calculateHammingDistance(hash1, hash2);

        if (distance >= 0 && distance <= maxHammingDistance) {
          similarItems.push({ item: item2, distance });
        }
      }

      if (similarItems.length > 0) {
        // Add the original item
        similarItems.unshift({ item: item1, distance: 0 });

        // Group by similar distance ranges
        const groupKey = `similar_${hash1}`;
        if (!similarGroups.has(groupKey)) {
          similarGroups.set(groupKey, []);
        }

        similarGroups.get(groupKey)!.push({
          items: similarItems.map((si) => si.item),
          distance: Math.min(...similarItems.map((si) => si.distance)),
        });

        // Mark all these hashes as processed
        similarItems.forEach((si) => processedHashes.add(si.item.visual_hash!));
      }

      processedHashes.add(hash1);
    }

    // Convert to result format
    const groups: DuplicateGroup[] = [];
    let exactMatches = 0;
    let similarMatches = 0;

    // Add exact duplicate groups
    for (const [hash, items] of duplicateGroups) {
      if (items.length > 1) {
        groups.push({
          hash,
          items,
          similarity: 'exact',
          hammingDistance: 0,
        });
        exactMatches += items.length;
      }
    }

    // Add similar groups
    for (const [_, groupList] of similarGroups) {
      for (const group of groupList) {
        if (group.items.length > 1) {
          const totalBits = group.items[0].visual_hash!.length * 4; // 4 bits per hex character
          const similarity = categorizeSimilarity(group.distance, totalBits);

          groups.push({
            hash: `similar_${group.items[0].visual_hash}`,
            items: group.items,
            similarity,
            hammingDistance: group.distance,
          });
          similarMatches += group.items.length;
        }
      }
    }

    // Sort groups by similarity and number of items
    groups.sort((a, b) => {
      // Exact matches first
      if (a.similarity === 'exact' && b.similarity !== 'exact') return -1;
      if (b.similarity === 'exact' && a.similarity !== 'exact') return 1;

      // Then by number of items (more duplicates first)
      if (a.items.length !== b.items.length) {
        return b.items.length - a.items.length;
      }

      // Then by hamming distance (closer matches first)
      return (a.hammingDistance || 0) - (b.hammingDistance || 0);
    });

    const stats = {
      totalGroups: groups.length,
      totalDuplicateItems: exactMatches + similarMatches,
      exactMatches,
      similarMatches,
    };

    console.log(
      `[getDuplicates] Found ${stats.totalGroups} duplicate groups with ${stats.totalDuplicateItems} items`,
    );

    return { groups, stats };
  } catch (error) {
    console.error('[getDuplicates] Error finding duplicates:', error);
    return {
      groups: [],
      stats: {
        totalGroups: 0,
        totalDuplicateItems: 0,
        exactMatches: 0,
        similarMatches: 0,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
