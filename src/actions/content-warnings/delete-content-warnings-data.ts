'use server';
import { createSupabase } from '@/lib/supabase';

/**
 * Delete all content warnings data and reset processing flags
 *
 * @returns Boolean indicating success
 */
export default async function deleteContentWarningsData(): Promise<boolean> {
	try {
		const supabase = createSupabase();
		let totalReset = 0;

		// Reset is_content_warnings_processed for all processed items in batches
		while (true) {
			const { error: updateError, count } = await supabase
				.from('media')
				.update({ is_content_warnings_processed: false })
				.eq('is_content_warnings_processed', true);

			if (updateError) {
				console.error('Failed to reset content warnings data:', updateError);
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

		console.log('Finished resetting content warnings data for media items.');
		return true;
	} catch (error) {
		console.error('Exception during update of media items:', error);
		return false;
	}
}
