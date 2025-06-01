'use server';

import { createSupabase } from 'shared';
import type { MediaType } from '@/types/media-types';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

/**
 * Fetch all media types from the database
 */
export async function getMediaTypes(): Promise<{
	types: MediaType[] | null;
	error: unknown;
}> {
	try {
		const supabase = createSupabase();
		const { data, error } = await supabase
			.from('media_types')
			.select('*')
			.order('mime_type', { ascending: true });

		if (error) {
			throw error;
		}

		return { types: data, error: null };
	} catch (error) {
		console.error('Error fetching media types:', error);
		return { types: null, error };
	}
}

/**
 * Update a media type's properties
 */
export async function updateMediaType(
	id: string,
	updates: TablesUpdate<'media_types'>,
): Promise<{ success: boolean; error: unknown }> {
	try {
		const supabase = createSupabase();
		const { error } = await supabase
			.from('media_types')
			.update(updates)
			.eq('id', id);

		if (error) {
			throw error;
		}

		return { success: true, error: null };
	} catch (error) {
		console.error('Error updating media type:', error);
		return { success: false, error };
	}
}

/**
 * Delete all media types
 * Note: This will fail if there are media items using any of the types
 */
export default async function deleteAllMediaTypes(): Promise<{
	success: boolean;
	error?: unknown;
	message?: string;
}> {
	try {
		const supabase = createSupabase();
		const { error } = await supabase
			.from('media_types')
			.delete()
			.not('id', 'is', null);

		if (error) {
			throw error;
		}

		return {
			success: true,
			message: 'All media types have been successfully deleted.',
		};
	} catch (error) {
		console.error('Error deleting all media types:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Get or create a media type in the database
 * Uses upsert, but does not update on conflict (only inserts if not exists)
 */
export async function getOrCreateMediaType(
	mimeType: string,
): Promise<string | null> {
	try {
		const supabase = createSupabase();

		const upsertObject: TablesInsert<'media_types'> = {
			mime_type: mimeType,
			description: `${mimeType.split('/')[0]} files`,
		};

		const { error: upsertError } = await supabase
			.from('media_types')
			.upsert(upsertObject, {
				onConflict: 'mime_type',
				ignoreDuplicates: true,
			});

		if (upsertError) {
			console.error('Error upserting media type:', upsertError);
			return null;
		}

		// Now fetch the id (either the one we just inserted, or the existing one)
		const { data: foundType, error: selectError } = await supabase
			.from('media_types')
			.select('id')
			.eq('mime_type', mimeType)
			.limit(1)
			.single();

		if (selectError || !foundType) {
			console.error('Error fetching media type after upsert:', selectError);
			return null;
		}

		return foundType.id;
	} catch (error) {
		console.error('Error in getOrCreateMediaType:', error);
		return null;
	}
}
