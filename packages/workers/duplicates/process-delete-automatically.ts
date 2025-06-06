import { createSupabase } from 'shared';

interface DuplicatePair {
  id: string;
  media_id: string;
  duplicate_id: string;
  media: {
    id: string;
    media_path: string;
    size_bytes: number;
    exif_data: any;
    thumbnail_process: string;
  };
  duplicate_media: {
    id: string;
    media_path: string;
    size_bytes: number;
    exif_data: any;
    thumbnail_process: string;
  };
}

interface DuplicateAction {
  action: 'delete_a' | 'delete_b' | 'skip';
  reason: string;
  confidence: number; // 0-1, where 1 is most confident
}

type DuplicateRule = (pair: DuplicatePair) => DuplicateAction;

/**
 * Rule: Check if two media objects are identical in all attributes
 * Returns action to delete the less preferred file based on naming and timestamps
 */
function ruleStrictIdentical(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  // Compare all attributes except id and path
  const mediaToCompare = {
    ...media,
    id: undefined,
    media_path: media.media_path.split('/').pop(),
    size_bytes: media.size_bytes,
    thumbnail_url: undefined,
  };

  const duplicateToCompare = {
    ...duplicate_media,
    id: undefined,
    media_path: duplicate_media.media_path.split('/').pop(),
    size_bytes: duplicate_media.size_bytes,
    thumbnail_url: undefined,
  };

  const areIdentical =
    JSON.stringify(mediaToCompare) === JSON.stringify(duplicateToCompare);

  if (!areIdentical) {
    return {
      action: 'skip',
      reason: 'Files are not strictly identical',
      confidence: 0,
    };
  }

  // Determine which to keep using existing logic
  const mediaFileName = media.media_path.split('/').pop() || '';
  const duplicateFileName = duplicate_media.media_path.split('/').pop() || '';

  const renamedPattern =
    /^f\d+\.(sr2|nef|arw|cr2|dng|raf|rw2|orf|pef|3fr|fff|iiq|rwl|srw|x3f|jpg|jpeg|png|tiff?|bmp|gif|webp)$/i;

  const mediaRenamed = renamedPattern.test(mediaFileName.toLowerCase());
  const duplicateRenamed = renamedPattern.test(duplicateFileName.toLowerCase());

  // Prefer non-renamed files
  if (mediaRenamed && !duplicateRenamed) {
    return {
      action: 'delete_a',
      reason: 'Media A is a renamed file, keeping original',
      confidence: 0.9,
    };
  }
  if (!mediaRenamed && duplicateRenamed) {
    return {
      action: 'delete_b',
      reason: 'Media B is a renamed file, keeping original',
      confidence: 0.9,
    };
  }

  // Check timestamps - prefer earlier
  if (
    media.exif_data?.exif_timestamp &&
    duplicate_media.exif_data?.exif_timestamp
  ) {
    const mediaTime = new Date(media.exif_data.exif_timestamp).getTime();
    const duplicateTime = new Date(
      duplicate_media.exif_data.exif_timestamp,
    ).getTime();

    if (mediaTime < duplicateTime) {
      return {
        action: 'delete_b',
        reason: 'Media A has earlier timestamp',
        confidence: 0.8,
      };
    }
    if (duplicateTime < mediaTime) {
      return {
        action: 'delete_a',
        reason: 'Media B has earlier timestamp',
        confidence: 0.8,
      };
    }
  }

  // Prefer larger file size as tiebreaker
  if (media.size_bytes > duplicate_media.size_bytes) {
    return {
      action: 'delete_b',
      reason: 'Media A is larger',
      confidence: 0.7,
    };
  }

  return {
    action: 'delete_a',
    reason: 'Media B is larger or same size (tiebreaker)',
    confidence: 0.7,
  };
}

/**
 * Rule: Detect embedded versions of files
 * Embedded files are typically JPGs with "embedded" in the name, paired with larger RAW files
 */
function ruleEmbeddedVersion(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  const mediaFileName = media.media_path.split('/').pop()?.toLowerCase() || '';
  const duplicateFileName =
    duplicate_media.media_path.split('/').pop()?.toLowerCase() || '';

  const mediaIsJpg = /\.(jpg|jpeg)$/i.test(mediaFileName);
  const duplicateIsJpg = /\.(jpg|jpeg)$/i.test(duplicateFileName);

  const mediaHasEmbedded = mediaFileName.includes('embedded');
  const duplicateHasEmbedded = duplicateFileName.includes('embedded');

  const rawExtensions =
    /\.(sr2|nef|arw|cr2|dng|raf|rw2|orf|pef|3fr|fff|iiq|rwl|srw|x3f)$/i;
  const mediaIsRaw = rawExtensions.test(mediaFileName);
  const duplicateIsRaw = rawExtensions.test(duplicateFileName);

  // Case 1: Media A is embedded JPG, Media B is RAW or much larger
  if (
    mediaIsJpg &&
    mediaHasEmbedded &&
    (duplicateIsRaw || duplicate_media.size_bytes > media.size_bytes * 2)
  ) {
    return {
      action: 'delete_a',
      reason: 'Media A is an embedded JPG version of the larger file',
      confidence: 0.95,
    };
  }

  // Case 2: Media B is embedded JPG, Media A is RAW or much larger
  if (
    duplicateIsJpg &&
    duplicateHasEmbedded &&
    (mediaIsRaw || media.size_bytes > duplicate_media.size_bytes * 2)
  ) {
    return {
      action: 'delete_b',
      reason: 'Media B is an embedded JPG version of the larger file',
      confidence: 0.95,
    };
  }

  return {
    action: 'skip',
    reason: 'No embedded version pattern detected',
    confidence: 0,
  };
}

/**
 * Process and delete duplicates automatically using a set of rules.
 * Each rule takes a duplicate pair and returns an action to take.
 */
export async function processDeleteAutomatically(): Promise<boolean> {
  const supabase = createSupabase();

  // Define the rules to apply in order of preference
  const deletionRules: DuplicateRule[] = [
    ruleStrictIdentical,
    ruleEmbeddedVersion,
  ];

  try {
    console.log('Starting delete-automatically process...');

    // Get all duplicate pairs with media details
    const { data: duplicatePairs, error } = await supabase
      .from('duplicates')
      .select(`
        media_id,
        duplicate_id,
        media: media!media_id (
          media_path,
          size_bytes,
          thumbnail_process,
          exif_data ( * )
        ),
        duplicate_media: media!duplicate_id (
          media_path,
          size_bytes,
          thumbnail_process,
          exif_data ( * )
        )
      `);

    if (error) {
      console.error('Error fetching duplicate pairs:', error);
      return false;
    }

    if (!duplicatePairs || duplicatePairs.length === 0) {
      console.log('No duplicate pairs found');
      return true;
    }

    let processedCount = 0;
    let deletedCount = 0;

    for (const pair of duplicatePairs as DuplicatePair[]) {
      if (!pair.media || !pair.duplicate_media) {
        console.warn(`Skipping pair ${pair.media_id} - missing media data`);
        continue;
      }

      // Apply rules in order until one returns a non-skip action
      let actionTaken: DuplicateAction | null = null;

      for (const deletionRule of deletionRules) {
        const action = deletionRule(pair);
        if (action.action !== 'skip') {
          actionTaken = action;
          break;
        }
      }

      if (!actionTaken || actionTaken.action === 'skip') {
        console.log(
          `No action taken for pair ${pair.media_id} <-> ${pair.duplicate_id}`,
        );
        continue;
      }

      // Determine which media to delete based on the action
      const mediaToDelete =
        actionTaken.action === 'delete_a' ? pair.media_id : pair.duplicate_id;
      const mediaToKeep =
        actionTaken.action === 'delete_a' ? pair.duplicate_id : pair.media_id;

      console.log(
        `Deleting duplicate: ${mediaToDelete}, keeping: ${mediaToKeep} (${actionTaken.reason}, confidence: ${actionTaken.confidence})`,
      );

      // // Mark the selected media as deleted
      // const { error: deleteError } = await supabase
      //   .from('media')
      //   .update({ is_deleted: true })
      //   .eq('id', mediaToDelete);

      // if (deleteError) {
      //   console.error(
      //     `Error marking media ${mediaToDelete} as deleted:`,
      //     deleteError,
      //   );
      //   continue;
      // }

      // // Delete the duplicate pair
      // const { error: dismissError } = await supabase
      //   .from('duplicates')
      //   .delete()
      //   .eq('media_id', pair.media_id)
      //   .eq('duplicate_id', pair.duplicate_id);

      // if (dismissError) {
      //   console.error(
      //     `Error dismissing duplicate pair ${pair.id}:`,
      //     dismissError,
      //   );
      //   continue;
      // }

      deletedCount++;
      processedCount++;
    }

    console.log(
      `Processed ${processedCount} duplicate pairs, deleted ${deletedCount} duplicates`,
    );
    return true;
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in processDeleteAutomatically:', errorMessage);
    return false;
  }
}
