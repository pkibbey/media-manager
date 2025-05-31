'use server';

import { createSupabase } from '@/lib/supabase';

export default async function deleteAllMediaItems(): Promise<boolean> {
	const supabase = createSupabase();
	try {
		// Delete all rows from the media_items table.
		const { error: deleteError } = await supabase
			.from('media')
			.delete()
			.not('id', 'is', null);

		if (deleteError) {
			console.error('Error deleting media items:', deleteError);
			return false;
		}

		return true;
	} catch (err) {
		console.error('Unexpected error during media items deletion:', err);
		return false;
	}
}
