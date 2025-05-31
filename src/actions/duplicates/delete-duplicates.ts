'use server';

import { createSupabase } from '@/lib/supabase';

export interface DeleteDuplicatesResult {
	success: boolean;
	deletedCount: number;
	error?: string;
}

/**
 * Delete selected media items and their associated data
 * @param mediaIds - Array of media item IDs to delete
 * @returns Result with count of deleted items
 */
export default async function deleteSelectedDuplicates(
	mediaIds: string[],
): Promise<DeleteDuplicatesResult> {
	try {
		if (!mediaIds || mediaIds.length === 0) {
			return {
				success: false,
				deletedCount: 0,
				error: 'No media items selected for deletion',
			};
		}

		const supabase = createSupabase();
		let deletedCount = 0;

		console.log(
			`[deleteSelectedDuplicates] Deleting ${mediaIds.length} media items and associated data`,
		);

		// Delete EXIF data
		const { error: exifError } = await supabase
			.from('exif_data')
			.delete()
			.in('media_id', mediaIds);

		if (exifError) {
			console.warn(
				'[deleteSelectedDuplicates] Error deleting EXIF data:',
				exifError.message,
			);
		}

		// Delete analysis data
		const { error: analysisError } = await supabase
			.from('analysis_data')
			.delete()
			.in('media_id', mediaIds);

		if (analysisError) {
			console.warn(
				'[deleteSelectedDuplicates] Error deleting analysis data:',
				analysisError.message,
			);
		}

		// Finally, delete the media items themselves
		const { error: mediaError, count } = await supabase
			.from('media')
			.delete({ count: 'exact' })
			.in('id', mediaIds);

		if (mediaError) {
			throw new Error(`Failed to delete media items: ${mediaError.message}`);
		}

		deletedCount = count || 0;

		console.log(
			`[deleteSelectedDuplicates] Successfully deleted ${deletedCount} media items`,
		);

		return {
			success: true,
			deletedCount,
		};
	} catch (error) {
		console.error(
			'[deleteSelectedDuplicates] Error deleting duplicates:',
			error,
		);
		return {
			success: false,
			deletedCount: 0,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
		};
	}
}
