'use server';

import { createSupabase } from 'shared';
import type { DuplicatePair } from './get-duplicate-pairs';

/**
 * Common return type for bulk operations
 */
interface BulkOperationResult {
  success: boolean;
  processed: number;
  deleted: number;
  error: string | null;
}

/**
 * Standard database query for fetching duplicate pairs with media information
 * Fetches all duplicate pairs using pagination to handle large datasets
 */
async function fetchDuplicatePairs() {
  const supabase = createSupabase();
  const allDuplicatePairs = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data: duplicatePairs, error: fetchError } = await supabase
      .from('duplicates')
      .select(`
        id,
        media_id,
        duplicate_id,
        similarity_score,
        hamming_distance,
        media: media!media_id (
          id,
          thumbnail_url,
          thumbnail_process,
          media_path,
          size_bytes,
          exif_data (
            width,
            height,
            exif_timestamp,
            exif_process,
            fix_date_process
          )
        ),
        duplicate_media: media!duplicate_id (
          id,
          thumbnail_url,
          thumbnail_process,
          media_path,
          size_bytes,
          exif_data (
            width,
            height,
            exif_timestamp,
            fix_date_process,
            exif_process
          )
        )
      `)
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (fetchError) {
      throw fetchError;
    }

    if (!duplicatePairs || duplicatePairs.length === 0) {
      // No more items to fetch
      break;
    }

    allDuplicatePairs.push(...duplicatePairs);

    // If we got fewer items than the batch size, we've reached the end
    if (duplicatePairs.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return allDuplicatePairs;
}

/**
 * Mark a media item as deleted and remove all its duplicate relationships
 */
async function deleteMediaAndRelationships(mediaId: string): Promise<void> {
  const supabase = createSupabase();

  // Mark media as deleted
  const { error: updateError } = await supabase
    .from('media')
    .update({ is_deleted: true })
    .eq('id', mediaId);

  if (updateError) {
    throw updateError;
  }

  // Remove all duplicate entries involving this media
  const { error: deleteError } = await supabase
    .from('duplicates')
    .delete()
    .or(`media_id.eq.${mediaId},duplicate_id.eq.${mediaId}`);

  if (deleteError) {
    throw deleteError;
  }
}

/**
 * Process duplicate pairs and perform bulk deletions based on criteria function
 */
async function processBulkDeletions<T>(
  operationName: string,
  criteriaFunction: (pair: DuplicatePair) => T,
  getMediaIdToDelete: (result: T, pair: DuplicatePair) => string | null,
  getLogMessage: (result: T, pair: DuplicatePair) => string | null,
): Promise<BulkOperationResult> {
  try {
    console.log(`Starting ${operationName} process...`);

    const duplicatePairs = await fetchDuplicatePairs();

    if (duplicatePairs.length === 0) {
      console.log('No duplicate pairs found');
      return { success: true, processed: 0, deleted: 0, error: null };
    }

    let processedCount = 0;
    let deletedCount = 0;
    const mediaToDelete = new Set<string>();

    // Identify files that should be deleted
    for (const pair of duplicatePairs) {
      processedCount++;

      // Skip if either media item is missing
      if (!pair.media || !pair.duplicate_media) {
        console.warn(
          `Skipping pair ${pair.media_id}-${pair.duplicate_id} - missing media data`,
        );
        continue;
      }

      const result = criteriaFunction(pair);
      console.log('result: ', result);
      const mediaIdToDelete = getMediaIdToDelete(result, pair);
      const logMessage = getLogMessage(result, pair);

      if (mediaIdToDelete) {
        mediaToDelete.add(mediaIdToDelete);
        if (logMessage) {
          console.log(logMessage);
        }
      }
    }

    console.log(`Found ${mediaToDelete.size} files to delete`);

    // Perform the deletions
    for (const mediaId of mediaToDelete) {
      try {
        await deleteMediaAndRelationships(mediaId);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting media ${mediaId}:`, error);
      }
    }

    console.log(
      `Processed ${processedCount} duplicate pairs, deleted ${deletedCount} files`,
    );

    return {
      success: true,
      processed: processedCount,
      deleted: deletedCount,
      error: null,
    };
  } catch (error) {
    console.error(`Error in ${operationName}:`, error);
    return {
      success: false,
      processed: 0,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark a specific media item as deleted and remove all its duplicate relationships
 */
export async function markMediaAsDeleted(mediaId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    await deleteMediaAndRelationships(mediaId);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error marking media as deleted:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a specific duplicate relationship without deleting media
 */
export async function dismissDuplicate(
  mediaId: string,
  duplicateId: string,
): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = createSupabase();

    // Remove the specific duplicate relationship (both directions)
    const { error: deleteError } = await supabase
      .from('duplicates')
      .delete()
      .or(
        `and(media_id.eq.${mediaId},duplicate_id.eq.${duplicateId}),and(media_id.eq.${duplicateId},duplicate_id.eq.${mediaId})`,
      );

    if (deleteError) {
      throw deleteError;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error dismissing duplicate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete all identical duplicate images based on strict criteria
 */
export async function deleteAllIdentical(): Promise<BulkOperationResult> {
  return processBulkDeletions(
    'deleteAllIdentical',
    (pair) => areIdentical(pair),
    (result, pair) => (result === true ? pair.duplicate_id : null),
    (result, pair) =>
      result === true
        ? `Marking for deletion: ${pair.duplicate_media.media_path} (duplicate of ${pair.media.media_path})`
        : null,
  );
}

/**
 * Delete JPG files that have a corresponding raw file duplicate with matching criteria
 */
export async function deleteJpgWithRawDuplicates(): Promise<BulkOperationResult> {
  return processBulkDeletions(
    'deleteJpgWithRawDuplicates',
    (pair) => shouldDeleteJpgForRaw(pair),
    (result) => (result.shouldDelete ? result.jpgMediaId : null),
    (result) =>
      result.shouldDelete
        ? `Marking JPG for deletion: ${result.jpgPath} (has raw duplicate: ${result.rawPath})`
        : null,
  );
}

/**
 * Delete larger files when duplicates have identical extensions, dimensions, and timestamps but different file sizes
 */
export async function deleteLargerIdenticalDuplicates(): Promise<BulkOperationResult> {
  return processBulkDeletions(
    'deleteLargerIdenticalDuplicates',
    (pair) => shouldDeleteLargerIdenticalFile(pair),
    (result) => (result.shouldDelete ? result.largerMediaId : null),
    (result) =>
      result.shouldDelete
        ? `Marking larger file for deletion: ${result.largerPath} (${result.largerSize} bytes) - keeping smaller: ${result.smallerPath} (${result.smallerSize} bytes)`
        : null,
  );
}

/**
 * Delete files with lowercase extensions when duplicates have identical properties except extension case
 */
export async function deleteIdenticalWithLowercaseExtension(): Promise<BulkOperationResult> {
  return processBulkDeletions(
    'deleteIdenticalWithLowercaseExtension',
    (pair) => shouldDeleteLowercaseExtensionFile(pair),
    (result) => (result.shouldDelete ? result.lowercaseMediaId : null),
    (result) =>
      result.shouldDelete
        ? `Marking lowercase extension file for deletion: ${result.lowercasePath} - keeping uppercase: ${result.uppercasePath}`
        : null,
  );
}

/**
 * Delete files with oddly specific dimensions (like 500x500, 1000x1000, 9x9) that are likely thumbnails or generated images
 */
export async function deleteOddlySpecificDimensions(): Promise<BulkOperationResult> {
  return processBulkDeletions(
    'deleteOddlySpecificDimensions',
    (pair) => shouldDeleteOddlySpecificDimensions(pair),
    (result) => (result.shouldDelete ? result.specificDimensionMediaId : null),
    (result) =>
      result.shouldDelete
        ? `Marking file with oddly specific dimensions for deletion: ${result.specificDimensionPath} (${result.width}x${result.height}) - keeping: ${result.otherPath}`
        : null,
  );
}

/**
 * Delete files with "embedded" in filename when duplicates have identical extensions, dimensions, and the embedded file is smaller
 */
export async function deleteEmbeddedDuplicates(): Promise<BulkOperationResult> {
  return processBulkDeletions(
    'deleteEmbeddedDuplicates',
    (pair) => shouldDeleteEmbeddedFile(pair),
    (result) => (result.shouldDelete ? result.embeddedMediaId : null),
    (result) =>
      result.shouldDelete
        ? `Marking embedded file for deletion: ${result.embeddedPath} (${result.embeddedSize} bytes) - keeping: ${result.otherPath} (${result.otherSize} bytes)`
        : null,
  );
}

// Helper function to extract file extension (case sensitive)
function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

// Helper function to check if a file extension is a raw format
function isRawFileExtension(extension: string): boolean {
  const rawExtensions = [
    'arw',
    'cr2',
    'cr3',
    'dng',
    'nef',
    'orf',
    'raf',
    'rw2',
    'pef',
    'srw',
    'x3f',
    'iiq',
    '3fr',
    'dcr',
    'k25',
    'kdc',
    'mrw',
    'raw',
    'rwl',
    'sr2',
    'srf',
  ];
  return rawExtensions.includes(extension.toLowerCase());
}

// Helper function to check if two images are identical
function areIdentical(pair: DuplicatePair): string | boolean {
  // Check byte size
  if (pair.media.size_bytes !== pair.duplicate_media.size_bytes) {
    return 'size_bytes';
  }

  // Check file extensions (case sensitive)
  const mediaExt = getFileExtension(pair.media.media_path);
  const duplicateExt = getFileExtension(pair.duplicate_media.media_path);
  if (mediaExt !== duplicateExt) {
    return 'extension';
  }

  // Check dimensions
  const mediaWidth = pair.media.exif_data?.width;
  const mediaHeight = pair.media.exif_data?.height;
  const duplicateWidth = pair.duplicate_media.exif_data?.width;
  const duplicateHeight = pair.duplicate_media.exif_data?.height;

  if (mediaWidth !== duplicateWidth || mediaHeight !== duplicateHeight) {
    return 'dimensions';
  }

  // Check hamming distance (lower is more similar, 0-5 is very similar)
  if (pair.hamming_distance !== 0) {
    return 'hamming_distance';
  }

  // Check similarity score (higher is more similar, >= 0.95 is very similar)
  if (pair.similarity_score !== 1) {
    return 'similarity_score';
  }

  return true;
}

// Helper function to check if a JPG should be deleted in favor of a raw file
function shouldDeleteJpgForRaw(pair: DuplicatePair):
  | {
      shouldDelete: boolean;
      reason?: string;
      jpgMediaId: string;
      jpgPath: string;
      rawPath: string;
    }
  | { shouldDelete: false; reason?: string } {
  const mediaExt = getFileExtension(pair.media.media_path);
  const duplicateExt = getFileExtension(pair.duplicate_media.media_path);

  const isMediaJpg =
    mediaExt.toLowerCase() === 'jpg' || mediaExt.toLowerCase() === 'jpeg';
  const isDuplicateJpg =
    duplicateExt.toLowerCase() === 'jpg' ||
    duplicateExt.toLowerCase() === 'jpeg';
  const isMediaRaw = isRawFileExtension(mediaExt);
  const isDuplicateRaw = isRawFileExtension(duplicateExt);

  // Check if one is JPG and the other is raw
  let jpgMedia: typeof pair.media;
  let rawMedia: typeof pair.media;
  let jpgMediaId: string;

  if (isMediaJpg && isDuplicateRaw) {
    jpgMedia = pair.media;
    rawMedia = pair.duplicate_media;
    jpgMediaId = pair.media_id;
  } else if (isDuplicateJpg && isMediaRaw) {
    jpgMedia = pair.duplicate_media;
    rawMedia = pair.media;
    jpgMediaId = pair.duplicate_id;
  } else {
    // Neither is a JPG-raw pair
    return { shouldDelete: false, reason: 'not_jpg_raw_pair' };
  }

  // Check dimensions are equal
  const jpgWidth = jpgMedia.exif_data?.width;
  const jpgHeight = jpgMedia.exif_data?.height;
  const rawWidth = rawMedia.exif_data?.width;
  const rawHeight = rawMedia.exif_data?.height;

  if (!jpgWidth || !jpgHeight || !rawWidth || !rawHeight) {
    console.log(
      'jpgWidth || !jpgHeight || !rawWidth || !rawHeight: ',
      !jpgWidth,
      jpgMedia.exif_data,
      !jpgHeight,
      !rawWidth,
      !rawHeight,
    );
    // Missing dimension data
    return { shouldDelete: false, reason: 'missing_dimensions' };
  }

  if (jpgWidth !== rawWidth || jpgHeight !== rawHeight) {
    // Dimensions don't match
    return { shouldDelete: false, reason: 'dimensions_mismatch' };
  }

  // Check that raw file size is equal or greater than JPG
  if (rawMedia.size_bytes < jpgMedia.size_bytes) {
    // Raw file is smaller than JPG (unexpected)
    return { shouldDelete: false, reason: 'raw_smaller_than_jpg' };
  }

  return {
    shouldDelete: true,
    jpgMediaId,
    jpgPath: jpgMedia.media_path,
    rawPath: rawMedia.media_path,
  };
}

// Helper function to check if the larger file should be deleted when files are identical except for size
function shouldDeleteLargerIdenticalFile(pair: DuplicatePair):
  | {
      shouldDelete: boolean;
      largerMediaId: string;
      largerPath: string;
      largerSize: number;
      smallerPath: string;
      smallerSize: number;
    }
  | { shouldDelete: false; reason?: string } {
  // Check if file sizes are different
  if (pair.media.size_bytes === pair.duplicate_media.size_bytes) {
    return { shouldDelete: false, reason: 'identical_file_sizes' };
  }

  // Check if extensions are identical (case sensitive)
  const mediaExt = getFileExtension(pair.media.media_path);
  const duplicateExt = getFileExtension(pair.duplicate_media.media_path);

  if (mediaExt !== duplicateExt) {
    return { shouldDelete: false, reason: 'different_extensions' };
  }

  // Check dimensions are identical
  const mediaWidth = pair.media.exif_data?.width;
  const mediaHeight = pair.media.exif_data?.height;
  const duplicateWidth = pair.duplicate_media.exif_data?.width;
  const duplicateHeight = pair.duplicate_media.exif_data?.height;

  if (!mediaWidth || !mediaHeight || !duplicateWidth || !duplicateHeight) {
    return { shouldDelete: false, reason: 'missing_dimensions' };
  }

  if (mediaWidth !== duplicateWidth || mediaHeight !== duplicateHeight) {
    return { shouldDelete: false, reason: 'different_dimensions' };
  }

  // Check timestamps are identical
  const mediaTimestamp = pair.media.exif_data?.exif_timestamp;
  const duplicateTimestamp = pair.duplicate_media.exif_data?.exif_timestamp;

  if (!mediaTimestamp || !duplicateTimestamp) {
    return { shouldDelete: false, reason: 'missing_timestamps' };
  }

  if (mediaTimestamp !== duplicateTimestamp) {
    return { shouldDelete: false, reason: 'different_timestamps' };
  }

  // Determine which file is larger
  let largerMedia: typeof pair.media;
  let smallerMedia: typeof pair.media;
  let largerMediaId: string;

  if (pair.media.size_bytes > pair.duplicate_media.size_bytes) {
    largerMedia = pair.media;
    smallerMedia = pair.duplicate_media;
    largerMediaId = pair.media_id;
  } else {
    largerMedia = pair.duplicate_media;
    smallerMedia = pair.media;
    largerMediaId = pair.duplicate_id;
  }

  return {
    shouldDelete: true,
    largerMediaId,
    largerPath: largerMedia.media_path,
    largerSize: largerMedia.size_bytes,
    smallerPath: smallerMedia.media_path,
    smallerSize: smallerMedia.size_bytes,
  };
}

// Helper function to check if the lowercase extension file should be deleted
function shouldDeleteLowercaseExtensionFile(pair: DuplicatePair):
  | {
      shouldDelete: boolean;
      lowercaseMediaId: string;
      lowercasePath: string;
      uppercasePath: string;
    }
  | { shouldDelete: false; reason?: string } {
  // File size check is not needed here

  // Check dimensions are identical
  const mediaWidth = pair.media.exif_data?.width;
  console.log('mediaWidth: ', mediaWidth);
  const mediaHeight = pair.media.exif_data?.height;
  console.log('mediaHeight: ', mediaHeight);
  const duplicateWidth = pair.duplicate_media.exif_data?.width;
  console.log('duplicateWidth: ', duplicateWidth);
  const duplicateHeight = pair.duplicate_media.exif_data?.height;
  console.log('duplicateHeight: ', duplicateHeight);

  if (!mediaWidth || !mediaHeight || !duplicateWidth || !duplicateHeight) {
    return { shouldDelete: false, reason: 'missing_dimensions' };
  }

  if (mediaWidth !== duplicateWidth || mediaHeight !== duplicateHeight) {
    return { shouldDelete: false, reason: 'different_dimensions' };
  }

  // Check timestamps are identical
  const mediaTimestamp = pair.media.exif_data?.exif_timestamp;
  const duplicateTimestamp = pair.duplicate_media.exif_data?.exif_timestamp;

  if (!mediaTimestamp || !duplicateTimestamp) {
    return { shouldDelete: false, reason: 'missing_timestamps' };
  }

  if (mediaTimestamp !== duplicateTimestamp) {
    return { shouldDelete: false, reason: 'different_timestamps' };
  }

  // Check extensions
  const mediaExt = getFileExtension(pair.media.media_path);
  const duplicateExt = getFileExtension(pair.duplicate_media.media_path);

  // Check if extensions are identical (already same case)
  if (mediaExt === duplicateExt) {
    return { shouldDelete: false, reason: 'same_case_extensions' };
  }

  // Determine which file has lowercase extension
  let lowercaseMedia: typeof pair.media;
  let uppercaseMedia: typeof pair.media;
  let lowercaseMediaId: string;

  const isMediaLowercase = mediaExt === mediaExt.toLowerCase();
  const isDuplicateLowercase = duplicateExt === duplicateExt.toLowerCase();

  if (isMediaLowercase && !isDuplicateLowercase) {
    lowercaseMedia = pair.media;
    uppercaseMedia = pair.duplicate_media;
    lowercaseMediaId = pair.media_id;
  } else if (!isMediaLowercase && isDuplicateLowercase) {
    lowercaseMedia = pair.duplicate_media;
    uppercaseMedia = pair.media;
    lowercaseMediaId = pair.duplicate_id;
  } else {
    // Both are lowercase or both are uppercase
    return { shouldDelete: false, reason: 'both_same_case' };
  }

  return {
    shouldDelete: true,
    lowercaseMediaId,
    lowercasePath: lowercaseMedia.media_path,
    uppercasePath: uppercaseMedia.media_path,
  };
}

// Helper function to check if a file has oddly specific dimensions
function shouldDeleteOddlySpecificDimensions(pair: DuplicatePair):
  | {
      shouldDelete: boolean;
      specificDimensionMediaId: string;
      specificDimensionPath: string;
      width: number;
      height: number;
      otherPath: string;
    }
  | { shouldDelete: false; reason?: string } {
  const mediaWidth = pair.media.exif_data?.width;
  const mediaHeight = pair.media.exif_data?.height;
  const duplicateWidth = pair.duplicate_media.exif_data?.width;
  const duplicateHeight = pair.duplicate_media.exif_data?.height;

  // Check if both files have valid dimensions
  if (!mediaWidth || !mediaHeight || !duplicateWidth || !duplicateHeight) {
    return { shouldDelete: false, reason: 'missing_dimensions' };
  }

  // Check if the dimensions are oddly specific (like 500x500, 1000x1000, 9x9)
  const specificDimensions = [
    { width: 500, height: 500 },
    { width: 1000, height: 1000 },
    { width: 9, height: 9 },
    { width: 7, height: 5 },
    { width: 500, height: 450 },
  ];

  // Check if either file has oddly specific dimensions
  const mediaHasSpecificDimensions = specificDimensions.some(
    (dim) => dim.width === mediaWidth && dim.height === mediaHeight,
  );
  const duplicateHasSpecificDimensions = specificDimensions.some(
    (dim) => dim.width === duplicateWidth && dim.height === duplicateHeight,
  );

  // If only one has specific dimensions, delete that one
  if (mediaHasSpecificDimensions && !duplicateHasSpecificDimensions) {
    return {
      shouldDelete: true,
      specificDimensionMediaId: pair.media_id,
      specificDimensionPath: pair.media.media_path,
      width: mediaWidth,
      height: mediaHeight,
      otherPath: pair.duplicate_media.media_path,
    };
  }

  if (duplicateHasSpecificDimensions && !mediaHasSpecificDimensions) {
    return {
      shouldDelete: true,
      specificDimensionMediaId: pair.duplicate_id,
      specificDimensionPath: pair.duplicate_media.media_path,
      width: duplicateWidth,
      height: duplicateHeight,
      otherPath: pair.media.media_path,
    };
  }

  // If both have specific dimensions or neither has them, don't delete
  return { shouldDelete: false, reason: 'no_unique_specific_dimensions' };
}

// Helper function to check if an embedded file should be deleted
function shouldDeleteEmbeddedFile(pair: DuplicatePair):
  | {
      shouldDelete: boolean;
      embeddedMediaId: string;
      embeddedPath: string;
      embeddedSize: number;
      otherPath: string;
      otherSize: number;
    }
  | { shouldDelete: false; reason?: string } {
  const mediaWidth = pair.media.exif_data?.width;
  const mediaHeight = pair.media.exif_data?.height;
  const duplicateWidth = pair.duplicate_media.exif_data?.width;
  const duplicateHeight = pair.duplicate_media.exif_data?.height;

  // Check if both files have valid dimensions
  if (!mediaWidth || !mediaHeight || !duplicateWidth || !duplicateHeight) {
    return { shouldDelete: false, reason: 'missing_dimensions' };
  }

  // Check if dimensions are identical
  if (mediaWidth !== duplicateWidth || mediaHeight !== duplicateHeight) {
    return { shouldDelete: false, reason: 'different_dimensions' };
  }

  // Check extensions are identical
  const mediaExt = getFileExtension(pair.media.media_path);
  const duplicateExt = getFileExtension(pair.duplicate_media.media_path);

  if (mediaExt !== duplicateExt) {
    return { shouldDelete: false, reason: 'different_extensions' };
  }

  // Check if file sizes are different
  if (pair.media.size_bytes === pair.duplicate_media.size_bytes) {
    return { shouldDelete: false, reason: 'identical_file_sizes' };
  }

  // Check if one of the files has "embedded" in filename
  const isMediaEmbedded = pair.media.media_path
    .toLowerCase()
    .includes('embedded');
  const isDuplicateEmbedded = pair.duplicate_media.media_path
    .toLowerCase()
    .includes('embedded');

  if (isMediaEmbedded && !isDuplicateEmbedded) {
    // Media is embedded, duplicate is not - check if embedded file is smaller
    if (pair.media.size_bytes >= pair.duplicate_media.size_bytes) {
      return { shouldDelete: false, reason: 'embedded_not_smaller' };
    }
    return {
      shouldDelete: true,
      embeddedMediaId: pair.media_id,
      embeddedPath: pair.media.media_path,
      embeddedSize: pair.media.size_bytes,
      otherPath: pair.duplicate_media.media_path,
      otherSize: pair.duplicate_media.size_bytes,
    };
  }

  if (!isMediaEmbedded && isDuplicateEmbedded) {
    // Duplicate is embedded, media is not - check if embedded file is smaller
    if (pair.duplicate_media.size_bytes >= pair.media.size_bytes) {
      return { shouldDelete: false, reason: 'embedded_not_smaller' };
    }
    return {
      shouldDelete: true,
      embeddedMediaId: pair.duplicate_id,
      embeddedPath: pair.duplicate_media.media_path,
      embeddedSize: pair.duplicate_media.size_bytes,
      otherPath: pair.media.media_path,
      otherSize: pair.media.size_bytes,
    };
  }

  return { shouldDelete: false, reason: 'none_embedded' };
}
