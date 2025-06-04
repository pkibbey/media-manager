import { parseDateFromFilename } from './parse-date-from-filename';
import { updateExifTimestamp } from './update-exif-timestamp';

/**
 * Process a single image to automatically fix its EXIF timestamp based on filename parsing
 * If no date is found in the filename, falls back to using the file creation date
 *
 * @param params - Object containing processing parameters
 * @param params.mediaId - The ID of the media item to process
 * @param params.mediaPath - The file system path to the media file
 * @returns Boolean indicating whether the processing was successful
 */
export async function processFixImageDates({
  mediaId,
  mediaPath,
}: {
  mediaId: string;
  mediaPath: string;
}): Promise<boolean> {
  try {
    console.log(`[FixImageDates] Processing media ${mediaId}: ${mediaPath}`);

    // Parse the date from the filename (with fallback to file creation date)
    const parseResult = await parseDateFromFilename(mediaPath);
    console.log(
      `[FixImageDates] Parse result for ${mediaId}:`,
      JSON.stringify(parseResult, null, 2),
    );

    if (!parseResult.date || !parseResult.source) {
      console.log(
        `[FixImageDates] No date found for media ${mediaId} (neither filename parsing nor file creation date)`,
      );
      return false;
    }

    // Update the EXIF timestamp
    const updateResult = await updateExifTimestamp(
      mediaId,
      parseResult.date,
      parseResult.source,
    );

    console.log(`[FixImageDates] Update result for ${mediaId}:`, updateResult);

    if (updateResult) {
      console.log(
        `[FixImageDates] Successfully updated EXIF for media ${mediaId}`,
      );
      return true;
    }

    console.log(`[FixImageDates] Failed to update EXIF for media ${mediaId}`);
    return false;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[FixImageDates] Error processing media ${mediaId}:`,
      errorMessage,
    );
    return false;
  }
}
