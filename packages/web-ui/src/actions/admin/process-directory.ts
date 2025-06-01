'use server';

import { createSupabase } from "@/lib/supabase";
import type { FileDetails, ScanResults } from '@/types/scan-types';
import type { TablesInsert } from '@/types/supabase';

/**
 * Process a batch of files and add them to the database using optimized batch operations
 *
 * This implementation uses the optimized pattern:
 * 1. Prepares all media records for batch insertion
 * 2. Groups all database inserts into a single batch operation
 *
 * This reduces database operations from N (where N is the number of files) to just 1 total operation.
 *
 * @param files - Array of file details to process
 * @returns Object with processing results and statistics
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

	if (!files || files.length === 0) {
		return results;
	}

	try {
		const supabase = createSupabase();

		// Prepare all media records for batch insertion
		const mediaRecords: TablesInsert<'media'>[] = [];

		// Build stats and prepare records
		for (const file of files) {
			// Update media type stats
			results.mediaTypeStats[file.mediaType.mime_type] =
				(results.mediaTypeStats[file.mediaType.mime_type] || 0) + 1;

			// Prepare media record for batch insertion
			const mediaRecord: TablesInsert<'media'> = {
				media_path: file.path,
				media_type_id: file.mediaType.id,
				size_bytes: file.size,
			};

			mediaRecords.push(mediaRecord);
		}

		// Perform batch upsert operation
		const { data, error: upsertError } = await supabase
			.from('media')
			.upsert(mediaRecords, {
				onConflict: 'media_path',
				ignoreDuplicates: true,
			})
			.select('media_path');

		if (upsertError) {
			throw new Error(
				`Failed to batch insert media files: ${upsertError.message}`,
			);
		}

		// Calculate results based on what was actually inserted
		// Note: With ignoreDuplicates: true, Supabase only returns newly inserted records
		const insertedCount = data?.length || 0;
		results.filesAdded = insertedCount;
		results.filesSkipped = files.length - insertedCount;

		console.log(
			`Batch processed ${files.length} files: ${insertedCount} added, ${results.filesSkipped} skipped (already existed)`,
		);

		return results;
	} catch (error) {
		console.error('Error in batch file processing:', error);

		// If batch operation fails, record the error
		results.success = false;
		results.errors.push(
			`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
		results.filesSkipped = files.length; // Mark all as skipped due to error

		return results;
	}
}
