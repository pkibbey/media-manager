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

/**
 * Check if two media objects are identical in all attributes except id, path, and thumbnail_url
 */
function areMediaIdentical(
  media: DuplicatePair['media'],
  duplicate: DuplicatePair['duplicate_media'],
): boolean {
  const mediaToCompare = {
    ...media,
    id: undefined,
    media_path: media.media_path.split('/').pop(),
    size_bytes: media.size_bytes,
    thumbnail_url: undefined,
  };

  const duplicateToCompare = {
    ...duplicate,
    id: undefined,
    media_path: media.media_path.split('/').pop(),
    size_bytes: media.size_bytes,
    thumbnail_url: undefined,
  };

  return JSON.stringify(mediaToCompare) === JSON.stringify(duplicateToCompare);
}

/**
 * Determine which media to keep when they're identical
 * Prefers: 1) non-renamed files, 2) earlier timestamps, 3) larger file size
 */
function selectMediaToKeep(
  media: DuplicatePair['media'],
  duplicate: DuplicatePair['duplicate_media'],
): string {
  // Check for renamed files (pattern like f[numbers].[extension])
  const mediaFileName = media.media_path.split('/').pop() || '';
  const duplicateFileName = duplicate.media_path.split('/').pop() || '';

  const renamedPattern =
    /^f\d+\.(sr2|nef|arw|cr2|dng|raf|rw2|orf|pef|3fr|fff|iiq|rwl|srw|x3f|jpg|jpeg|png|tiff?|bmp|gif|webp)$/i;

  const mediaRenamed = renamedPattern.test(mediaFileName.toLowerCase());
  const duplicateRenamed = renamedPattern.test(duplicateFileName.toLowerCase());

  // Prefer non-renamed files
  if (mediaRenamed && !duplicateRenamed) {
    return duplicate.id;
  }
  if (!mediaRenamed && duplicateRenamed) {
    return media.id;
  }

  // Check timestamps - prefer earlier
  if (media.exif_data?.exif_timestamp && duplicate.exif_data?.exif_timestamp) {
    const mediaTime = new Date(media.exif_data.exif_timestamp).getTime();
    const duplicateTime = new Date(
      duplicate.exif_data.exif_timestamp,
    ).getTime();

    if (mediaTime < duplicateTime) {
      return media.id;
    }
    if (duplicateTime < mediaTime) {
      return duplicate.id;
    }
  }

  // Prefer larger file size as tiebreaker
  if (media.size_bytes > duplicate.size_bytes) {
    return media.id;
  }

  return duplicate.id;
}

/**
 * Process and delete identical duplicates
 */
export async function processDeleteIdentical(): Promise<boolean> {
  const supabase = createSupabase();

  try {
    console.log('Starting delete-identical process...');

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
          exif_data (
            exif_timestamp,
            width,
            height,
            camera_make,
            camera_model,
            lens_model,
            aperture,
            exposure_time,
            iso,
            focal_length_35mm,
            gps_latitude,
            gps_longitude,
            exif_process,
            fix_date_process
          )
        ),
        duplicate_media: media!duplicate_id (
          media_path,
          size_bytes,
          thumbnail_process,
          exif_data (
            exif_timestamp,
            width,
            height,
            camera_make,
            camera_model,
            lens_model,
            aperture,
            exposure_time,
            iso,
            focal_length_35mm,
            gps_latitude,
            gps_longitude,
            exif_process,
            fix_date_process
          )
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

      // Check if media are identical in all attributes
      if (areMediaIdentical(pair.media, pair.duplicate_media)) {
        const mediaToKeep = selectMediaToKeep(pair.media, pair.duplicate_media);
        const mediaToDelete =
          mediaToKeep === pair.media_id ? pair.duplicate_id : pair.media_id;

        console.log(
          `Deleting identical duplicate: ${mediaToDelete}, keeping: ${mediaToKeep}`,
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
      }

      processedCount++;
    }

    console.log(
      `Processed ${processedCount} duplicate pairs, deleted ${deletedCount} identical duplicates`,
    );
    return true;
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Unknown error occurred';
    console.error('Error in processDeleteIdentical:', errorMessage);
    return false;
  }
}
