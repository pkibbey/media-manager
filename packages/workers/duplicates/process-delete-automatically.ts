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

// File type utilities
function getFileName(filePath: string): string {
  return filePath.split('/').pop() || '';
}

function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isRawFile(fileName: string): boolean {
  const rawExtensions =
    /\.(sr2|nef|arw|cr2|dng|raf|rw2|orf|pef|3fr|fff|iiq|rwl|srw|x3f)$/i;
  return rawExtensions.test(fileName);
}

function isJpegFile(fileName: string): boolean {
  const jpegExtensions = /\.(jpg|jpeg)$/i;
  return jpegExtensions.test(fileName);
}

// EXIF data utilities
function getExifDate(exif: any): string | undefined {
  return exif?.DateTimeOriginal || exif?.CreateDate || undefined;
}

function getExifDimensions(exif: any): { width?: number; height?: number } {
  if (!exif) return { width: undefined, height: undefined };
  return {
    width: exif.ImageWidth || exif.PixelXDimension || exif.width,
    height: exif.ImageHeight || exif.PixelYDimension || exif.height,
  };
}

// Comparison utilities
function haveSameDimensions(media1: any, media2: any): boolean {
  const dims1 = getExifDimensions(media1.exif_data);
  const dims2 = getExifDimensions(media2.exif_data);
  return dims1.width === dims2.width && dims1.height === dims2.height;
}

function haveSameDate(media1: any, media2: any): boolean {
  const date1 = getExifDate(media1.exif_data);
  const date2 = getExifDate(media2.exif_data);
  return date1 === date2;
}

function haveSameExtension(media1: any, media2: any): boolean {
  const ext1 = getFileExtension(media1.media_path);
  const ext2 = getFileExtension(media2.media_path);
  return ext1 === ext2;
}

function areBothExtensionsLowercase(media1: any, media2: any): boolean {
  const ext1 = getFileExtension(media1.media_path);
  const ext2 = getFileExtension(media2.media_path);
  return ext1 === ext1.toLowerCase() && ext2 === ext2.toLowerCase();
}

// Action creation utilities
function createDeleteAction(
  target: 'delete_a' | 'delete_b',
  reason: string,
  confidence: number,
): DuplicateAction {
  return { action: target, reason, confidence };
}

function createSkipAction(reason: string): DuplicateAction {
  return { action: 'skip', reason, confidence: 0 };
}

/**
 * Rule: Detect embedded versions of files
 * Embedded files are typically JPGs with "embedded" in the name, paired with larger RAW files
 */
function ruleEmbeddedVersion(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  const mediaFileName = getFileName(media.media_path);
  const duplicateFileName = getFileName(duplicate_media.media_path);

  const mediaIsJpg = isJpegFile(mediaFileName);
  const duplicateIsJpg = isJpegFile(duplicateFileName);
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
    return createDeleteAction(
      'delete_a',
      'Media A is an embedded JPG version of the larger file',
      0.95,
    );
  }

  // Case 2: Media B is embedded JPG, Media A is RAW or much larger
  if (
    duplicateIsJpg &&
    duplicateHasEmbedded &&
    (mediaIsRaw || media.size_bytes > duplicate_media.size_bytes * 2)
  ) {
    return createDeleteAction(
      'delete_b',
      'Media B is an embedded JPG version of the larger file',
      0.95,
    );
  }

  return createSkipAction('No embedded version pattern detected');
}

/**
 * Rule: Detect JPEG previews
 * If the larger file is a Raw file, and the smaller file is a JPEG
 * Then we should delete the JPEG preview
 */
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
    return createDeleteAction(
      'delete_a',
      'Media A is a JPEG preview of the larger RAW file',
      0.95,
    );
  }

  // Case 2: Media B is a JPEG preview, Media A is a larger RAW file
  if (
    duplicateIsJpeg &&
    mediaIsRaw &&
    duplicate_media.size_bytes < media.size_bytes
  ) {
    return createDeleteAction(
      'delete_b',
      'Media B is a JPEG preview of the larger RAW file',
      0.95,
    );
  }

  return createSkipAction('No JPEG preview pattern detected');
}

/**
 * Rule: Delete tiny files when compared to larger versions
 */
function ruleTinyFile(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;
  const mediaIsTiny = media.size_bytes < 1024; // Less than 1KB
  const duplicateIsTiny = duplicate_media.size_bytes < 1024; // Less than 1KB

  // Case 1: Media A is tiny, Media B is larger
  if (mediaIsTiny && !duplicateIsTiny) {
    return createDeleteAction(
      'delete_a',
      'Media A is a tiny file compared to Media B',
      0.9,
    );
  }

  // Case 2: Media B is tiny, Media A is larger
  if (duplicateIsTiny && !mediaIsTiny) {
    return createDeleteAction(
      'delete_b',
      'Media B is a tiny file compared to Media A',
      0.9,
    );
  }

  return createSkipAction('No tiny file pattern detected');
}

/**
 * Rule: Delete exact duplicates (same extension, size, date, and dimensions)
 */
function ruleExactDuplicate(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  // Check all conditions for exact duplicate
  const sameExtension = haveSameExtension(media, duplicate_media);
  const sameSize = media.size_bytes === duplicate_media.size_bytes;
  const sameDate = haveSameDate(media, duplicate_media);
  const sameDimensions = haveSameDimensions(media, duplicate_media);

  if (sameExtension && sameSize && sameDate && sameDimensions) {
    return createDeleteAction(
      'delete_a',
      'Exact duplicate: extension, size, date, and dimensions match',
      1,
    );
  }

  return createSkipAction('Not an exact duplicate');
}

/**
 * Rule: Delete if the first media item is exactly 500x500 pixels
 */
function ruleDelete500x500(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  const mediaDims = getExifDimensions(media.exif_data);
  const duplicateDims = getExifDimensions(duplicate_media.exif_data);

  if (mediaDims.width === 500 && mediaDims.height === 500) {
    return createDeleteAction(
      'delete_a',
      'Media A is exactly 500x500 pixels',
      1,
    );
  }

  if (duplicateDims.width === 500 && duplicateDims.height === 500) {
    return createDeleteAction(
      'delete_b',
      'Media B is exactly 500x500 pixels',
      1,
    );
  }

  return createSkipAction('Neither Media A, nor Media B are 500x500 pixels');
}

/**
 * Rule: If both are raw files, sizes, dimensions, and dates are identical,
 * keep the one whose filename is all caps.
 */
function ruleKeepAllCapsRaw(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  // Check both are raw files
  if (!isRawFile(media.media_path) || !isRawFile(duplicate_media.media_path)) {
    return createSkipAction(
      `Both files are not raw${media.media_path} ${duplicate_media.media_path}`,
    );
  }

  // Check date
  if (!haveSameDate(media, duplicate_media)) {
    return createSkipAction('Dates do not match');
  }

  // Check filenames for all caps
  const mediaFileName = getFileName(media.media_path);
  const duplicateFileName = getFileName(duplicate_media.media_path);

  const mediaAllCaps = mediaFileName === mediaFileName.toUpperCase();
  const duplicateAllCaps =
    duplicateFileName === duplicateFileName.toUpperCase();

  console.log('mediaAllCaps: ', mediaAllCaps, mediaFileName);
  console.log('duplicateAllCaps: ', duplicateAllCaps, duplicateFileName);

  if (mediaAllCaps && !duplicateAllCaps) {
    return createDeleteAction(
      'delete_b',
      'Both raw, identical, keep all-caps filename (A)',
      1,
    );
  }
  if (!mediaAllCaps && duplicateAllCaps) {
    return createDeleteAction(
      'delete_a',
      'Both raw, identical, keep all-caps filename (B)',
      1,
    );
  }

  return createSkipAction('No all-caps filename to prefer');
}

/**
 * Rule: If images have same dimensions, same date, and both have the same lowercase extension,
 * delete the one with the smallest file size.
 */
function ruleDeleteSmallestLowercaseExt(pair: DuplicatePair): DuplicateAction {
  const { media, duplicate_media } = pair;

  // Only proceed if both extensions are lowercase and match
  if (
    !haveSameExtension(media, duplicate_media) ||
    !areBothExtensionsLowercase(media, duplicate_media)
  ) {
    return createSkipAction('Extensions are not both lowercase and matching');
  }

  // Compare dimensions and dates
  if (!haveSameDimensions(media, duplicate_media)) {
    return createSkipAction('Dimensions do not match');
  }

  if (!haveSameDate(media, duplicate_media)) {
    return createSkipAction('Dates do not match');
  }

  // Delete the one with the smallest file size
  if (media.size_bytes < duplicate_media.size_bytes) {
    return createDeleteAction(
      'delete_a',
      'Same dims/date/lowercase ext, media A is smaller',
      1,
    );
  }
  if (duplicate_media.size_bytes < media.size_bytes) {
    return createDeleteAction(
      'delete_b',
      'Same dims/date/lowercase ext, media B is smaller',
      1,
    );
  }

  return createSkipAction('Sizes are identical, nothing to delete');
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
          exif_data(*)
        ),
        duplicate_media: media!duplicate_id (
          media_path,
          size_bytes,
          thumbnail_process,
          exif_data(*)
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
