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

function isRawFile(fileName: string): boolean {
  const rawExtensions =
    /\.(sr2|nef|arw|cr2|dng|raf|rw2|orf|pef|3fr|fff|iiq|rwl|srw|x3f)$/i;
  return rawExtensions.test(fileName);
}

function isJpegFile(fileName: string): boolean {
  const jpegExtensions = /\.(jpg|jpeg)$/i;
  return jpegExtensions.test(fileName);
}

function getFileName(filePath: string): string {
  return filePath.split('/').pop() || '';
}

/**
 * Rule: Detect embedded versions of files
 * Embedded files are typically JPGs with "embedded" in the name, paired with larger RAW files
 */
function ruleEmbeddedVersion(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  const mediaFileName = getFileName(media.media_path);
  const duplicateFileName = getFileName(duplicate_media.media_path);

  const mediaIsJpg = /\.(jpg|jpeg)$/i.test(mediaFileName);
  const duplicateIsJpg = /\.(jpg|jpeg)$/i.test(duplicateFileName);

  const mediaHasEmbedded = mediaFileName.includes('embedded');
  const duplicateHasEmbedded = duplicateFileName.includes('embedded');

  const mediaIsRaw = isRawFile(mediaFileName);
  const duplicateIsRaw = isRawFile(duplicateFileName);

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

// Rule: Detect JPEG previews
// If the larger file is a Raw file, and the smaller file is a JPEG
// Then we should delete the JPEG preview
function ruleJpegPreview(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;
  const mediaFileName = getFileName(media.media_path);
  const duplicateFileName = getFileName(duplicate_media.media_path);

  const mediaIsRaw = isRawFile(mediaFileName);
  const duplicateIsRaw = isRawFile(duplicateFileName);

  const mediaIsJpeg = isJpegFile(mediaFileName);
  const duplicateIsJpeg = isJpegFile(duplicateFileName);

  // Case 1: Media A is a JPEG preview, Media B is a larger RAW file
  if (
    mediaIsJpeg &&
    duplicateIsRaw &&
    media.size_bytes < duplicate_media.size_bytes
  ) {
    return {
      action: 'delete_a',
      reason: 'Media A is a JPEG preview of the larger RAW file',
      confidence: 0.95,
    };
  }
  // Case 2: Media B is a JPEG preview, Media A is a larger RAW file
  if (
    duplicateIsJpeg &&
    mediaIsRaw &&
    duplicate_media.size_bytes < media.size_bytes
  ) {
    return {
      action: 'delete_b',
      reason: 'Media B is a JPEG preview of the larger RAW file',
      confidence: 0.95,
    };
  }
  return {
    action: 'skip',
    reason: 'No JPEG preview pattern detected',
    confidence: 0,
  };
}

function ruleTinyFile(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;
  const mediaIsTiny = media.size_bytes < 1024; // Less than 1KB
  const duplicateIsTiny = duplicate_media.size_bytes < 1024; // Less than 1KB

  // Case 1: Media A is tiny, Media B is larger
  if (mediaIsTiny && !duplicateIsTiny) {
    return {
      action: 'delete_a',
      reason: 'Media A is a tiny file compared to Media B',
      confidence: 0.9,
    };
  }
  // Case 2: Media B is tiny, Media A is larger
  if (duplicateIsTiny && !mediaIsTiny) {
    return {
      action: 'delete_b',
      reason: 'Media B is a tiny file compared to Media A',
      confidence: 0.9,
    };
  }
  return {
    action: 'skip',
    reason: 'No tiny file pattern detected',
    confidence: 0,
  };
}

/**
 * Rule: Delete exact duplicates (same extension, size, date, and dimensions)
 */
function ruleExactDuplicate(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  // Extract file extensions (case sensitive)
  const getExtension = (filePath: string) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };

  const mediaExt = getExtension(media.media_path);
  const duplicateExt = getExtension(duplicate_media.media_path);

  // Extract date (try exif_data.DateTimeOriginal, fallback to exif_data.CreateDate, fallback to undefined)
  const getDate = (exif: any) =>
    exif?.DateTimeOriginal || exif?.CreateDate || undefined;

  const mediaDate = getDate(media.exif_data);
  const duplicateDate = getDate(duplicate_media.exif_data);

  // Extract dimensions (width/height)
  const getDims = (exif: any) => {
    if (!exif) return { width: undefined, height: undefined };
    return {
      width: exif.ImageWidth || exif.PixelXDimension,
      height: exif.ImageHeight || exif.PixelYDimension,
    };
  };

  const mediaDims = getDims(media.exif_data);
  const duplicateDims = getDims(duplicate_media.exif_data);

  // Check all conditions
  if (
    mediaExt === duplicateExt &&
    media.size_bytes === duplicate_media.size_bytes &&
    mediaDate === duplicateDate &&
    mediaDims.width === duplicateDims.width &&
    mediaDims.height === duplicateDims.height
  ) {
    return {
      action: 'delete_a',
      reason: 'Exact duplicate: extension, size, date, and dimensions match',
      confidence: 1,
    };
  }

  return {
    action: 'skip',
    reason: 'Not an exact duplicate',
    confidence: 0,
  };
}

/**
 * Rule: Delete if the first media item is exactly 500x500 pixels
 */
function ruleDelete500x500(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  if (media.exif_data.width === 500 && media.exif_data.height === 500) {
    return {
      action: 'delete_a',
      reason: 'Media A is exactly 500x500 pixels',
      confidence: 1,
    };
  }

  if (
    duplicate_media.exif_data.width === 500 &&
    duplicate_media.exif_data.height === 500
  ) {
    return {
      action: 'delete_b',
      reason: 'Media B is exactly 500x500 pixels',
      confidence: 1,
    };
  }

  return {
    action: 'skip',
    reason: 'Neither Media A, nor Media B are 500x500 pixels',
    confidence: 0,
  };
}

/**
 * Rule: If both are raw files, sizes, dimensions, and dates are identical,
 * keep the one whose filename is all caps.
 */
function ruleKeepAllCapsRaw(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  // Check both are raw files
  if (!isRawFile(media.media_path) || !isRawFile(duplicate_media.media_path)) {
    return {
      action: 'skip',
      reason: `Both files are not raw${media.media_path} ${duplicate_media.media_path}`,
      confidence: 0,
    };
  }

  // Check date
  const getDate = (exif: any) =>
    exif?.DateTimeOriginal || exif?.CreateDate || undefined;
  const mediaDate = getDate(media.exif_data);
  const duplicateDate = getDate(duplicate_media.exif_data);
  if (mediaDate !== duplicateDate) {
    return {
      action: 'skip',
      reason: 'Dates do not match',
      confidence: 0,
    };
  }

  // Check filenames
  const mediaFileName = getFileName(media.media_path);
  const duplicateFileName = getFileName(duplicate_media.media_path);

  const mediaAllCaps = mediaFileName === mediaFileName.toUpperCase();
  console.log('mediaAllCaps: ', mediaAllCaps, mediaFileName);
  const duplicateAllCaps =
    duplicateFileName === duplicateFileName.toUpperCase();
  console.log('duplicateAllCaps: ', duplicateAllCaps, duplicateFileName);

  if (mediaAllCaps && !duplicateAllCaps) {
    return {
      action: 'delete_b',
      reason: 'Both raw, identical, keep all-caps filename (A)',
      confidence: 1,
    };
  }
  if (!mediaAllCaps && duplicateAllCaps) {
    return {
      action: 'delete_a',
      reason: 'Both raw, identical, keep all-caps filename (B)',
      confidence: 1,
    };
  }

  return {
    action: 'skip',
    reason: 'No all-caps filename to prefer',
    confidence: 0,
  };
}

/**
 * Rule: If images have same dimensions, same date, and both have the same lowercase extension,
 * delete the one with the smallest file size.
 */
function ruleDeleteSmallestLowercaseExt(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  // Get extensions (lowercase, no dot)
  const getExt = (filePath: string) => {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };
  const mediaExt = getExt(media.media_path);
  const duplicateExt = getExt(duplicate_media.media_path);

  // Only proceed if both extensions are lowercase and match
  if (
    mediaExt !== duplicateExt ||
    mediaExt !== mediaExt.toLowerCase() ||
    duplicateExt !== duplicateExt.toLowerCase()
  ) {
    return {
      action: 'skip',
      reason: 'Extensions are not both lowercase and matching',
      confidence: 0,
    };
  }

  // Compare dimensions
  const getDims = (exif: any) => ({
    width: exif?.ImageWidth || exif?.PixelXDimension,
    height: exif?.ImageHeight || exif?.PixelYDimension,
  });
  const mediaDims = getDims(media.exif_data);
  const duplicateDims = getDims(duplicate_media.exif_data);

  if (
    mediaDims.width !== duplicateDims.width ||
    mediaDims.height !== duplicateDims.height
  ) {
    return {
      action: 'skip',
      reason: 'Dimensions do not match',
      confidence: 0,
    };
  }

  // Compare date
  const getDate = (exif: any) =>
    exif?.DateTimeOriginal || exif?.CreateDate || undefined;
  const mediaDate = getDate(media.exif_data);
  const duplicateDate = getDate(duplicate_media.exif_data);

  if (mediaDate !== duplicateDate) {
    return {
      action: 'skip',
      reason: 'Dates do not match',
      confidence: 0,
    };
  }

  // Delete the one with the smallest file size
  if (media.size_bytes < duplicate_media.size_bytes) {
    return {
      action: 'delete_a',
      reason: 'Same dims/date/lowercase ext, media A is smaller',
      confidence: 1,
    };
  }
  if (duplicate_media.size_bytes < media.size_bytes) {
    return {
      action: 'delete_b',
      reason: 'Same dims/date/lowercase ext, media B is smaller',
      confidence: 1,
    };
  }

  return {
    action: 'skip',
    reason: 'Sizes are identical, nothing to delete',
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
    ruleDelete500x500,
    ruleTinyFile,
    ruleJpegPreview,
    ruleEmbeddedVersion,
    ruleExactDuplicate,
    ruleKeepAllCapsRaw,
    ruleDeleteSmallestLowercaseExt,
  ];

  try {
    console.log('Starting auto-delete process...');

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

      // Mark the selected media as deleted
      const { error: deleteError } = await supabase
        .from('media')
        .update({ is_deleted: true })
        .eq('id', mediaToDelete);

      if (deleteError) {
        console.error(
          `Error marking media ${mediaToDelete} as deleted:`,
          deleteError,
        );
        continue;
      }

      // Delete the duplicate pair
      const { error: dismissError } = await supabase
        .from('duplicates')
        .delete()
        .eq('media_id', pair.media_id)
        .eq('duplicate_id', pair.duplicate_id);

      if (dismissError) {
        console.error(
          `Error dismissing duplicate pair ${pair.id}:`,
          dismissError,
        );
        continue;
      }

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
