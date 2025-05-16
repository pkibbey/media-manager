'use server';

import type { FileDetails, ScanResults } from '@/types/scan-types';
import { addFileToDatabase } from './add-file-to-database';

/**
 * Process a batch of files and add them to the database
 */
export async function processScanResults(
  files: FileDetails[],
): Promise<ScanResults> {
  const results: ScanResults = {
    success: true,
    filesAdded: 0,
    filesSkipped: 0,
    errors: [],
    mediaTypeStats: {},
  };

  // Process each file in the batch
  for (const file of files) {
    // Update stats
    results.mediaTypeStats[file.mediaType.mime_type] =
      (results.mediaTypeStats[file.mediaType.mime_type] || 0) + 1;

    // Add file to database
    const addResult = await addFileToDatabase(file);

    if (addResult.success) {
      results.filesAdded++;
    } else {
      results.filesSkipped++;
      if (addResult.error !== 'File already exists in database') {
        results.errors.push(`Error with ${file.path}: ${addResult.error}`);
      }
    }
  }

  return results;
}
