'use server';

import { createSupabase } from 'shared/supabase';

/**
 * Delete duplicates data and reset processing flags
 *
 * @returns Boolean indicating success
 */
export default async function deleteDuplicatesData(): Promise<boolean> {
	try {
		const supabase = createSupabase();
		let totalReset = 0;

		// Reset is_duplicates_processed and clear visual_hash in batches
		while (true) {
			const { error: updateError, count } = await supabase
				.from('media')
				.update({ is_duplicates_processed: false })
				.eq('is_duplicates_processed', true);

			if (updateError) {
				console.error('Failed to reset duplicates data:', updateError);
				return false;
			}

			const affectedRows = count || 0;
			totalReset += affectedRows;

			console.log(
				`Successfully reset ${affectedRows} media items. Total reset: ${totalReset}`,
			);

			if (affectedRows === 0) {
				// No more items to update
				break;
			}
		}

		console.log('Finished resetting duplicates data for media items.');
		return true;
	} catch (error) {
		console.error('Exception during update of media items:', error);
		return false;
	}
}
