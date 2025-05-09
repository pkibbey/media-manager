'use server';

import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuid } from 'uuid';
import { createServer } from '@/lib/supabase';
import type { MediaType } from '@/types/media-types';
import type { FileDetails, ScanResults } from '@/types/scan-types';

/**
 * Detect the MIME type from file buffer
 * This provides more accurate MIME type detection than relying on extension
 */
async function detectMimeType(file: FileDetails): Promise<string> {
  try {
    // If the file has a buffer or can be read as a buffer
    if (file.buffer) {
      const fileType = await fileTypeFromBuffer(file.buffer);
      if (fileType) {
        return fileType.mime;
      }
    }

    // Fallback to the provided MIME type if we can't detect it
    return file.type;
  } catch (error) {
    console.error('Error detecting MIME type:', error);
    return file.type;
  }
}

/**
 * Add a single file to the database
 */
async function addFileToDatabase(
  file: FileDetails,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServer();

    // First, find or create the media type
    const typeId = await getOrCreateMediaType(file.type);
    if (!typeId) {
      return {
        success: false,
        error: `Failed to create media type for ${file.type}`,
      };
    }

    // Check if the file already exists (by relative path)
    const { data: existingFiles } = await supabase
      .from('media')
      .select('id')
      .eq('media_path', file.relativePath)
      .limit(1);

    if (existingFiles && existingFiles.length > 0) {
      return { success: false, error: 'File already exists in database' };
    }

    // Add the file to the database
    const fileId = uuid();
    const { error } = await supabase.from('media').insert({
      id: fileId,
      media_path: file.relativePath, // Store the relative path
      media_type_id: typeId,
      size_bytes: file.size,
      created_date: file.lastModified
        ? new Date(file.lastModified).toISOString()
        : new Date().toISOString(),
      is_hidden: false,
      is_deleted: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Get or create a media type in the database
 */
async function getOrCreateMediaType(mimeType: string): Promise<string | null> {
  try {
    const supabase = createServer();
    const typeName = getMediaTypeFromMime(mimeType);

    // Check if the type already exists
    const { data: existingTypes } = await supabase
      .from('media_types')
      .select('id')
      .eq('type_name', typeName)
      .limit(1);

    if (existingTypes && existingTypes.length > 0) {
      return existingTypes[0].id;
    }

    // Create the type if it doesn't exist
    const typeId = uuid();
    const { error } = await supabase.from('media_types').insert({
      id: typeId,
      type_name: typeName,
      mime_type: mimeType,
      type_description: `${typeName} files`,
      is_ignored: false,
      is_native: true,
    });

    if (error) {
      console.error('Error creating media type:', error);
      return null;
    }

    return typeId;
  } catch (error) {
    console.error('Error in getOrCreateMediaType:', error);
    return null;
  }
}

/**
 * Convert a MIME type to a general media type category
 */
function getMediaTypeFromMime(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (mimeType.startsWith('video/')) {
    return 'video';
  }

  if (
    mimeType.startsWith('text/') ||
    mimeType.startsWith('application/pdf') ||
    mimeType.startsWith('application/msword') ||
    mimeType.includes('document')
  ) {
    return 'document';
  }

  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  return 'other';
}

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
    // Use the precise MIME type detection instead of relying on the provided type
    const preciseMimeType = await detectMimeType(file);

    // Use the detected MIME type for categorization
    const typeName = getMediaTypeFromMime(preciseMimeType);

    // Update the file type with the precise detected type
    const fileWithPreciseMime = {
      ...file,
      type: preciseMimeType,
    };

    // Update stats
    results.mediaTypeStats[typeName] =
      (results.mediaTypeStats[typeName] || 0) + 1;

    // Add file to database
    const addResult = await addFileToDatabase(fileWithPreciseMime);

    if (addResult.success) {
      results.filesAdded++;
    } else {
      results.filesSkipped++;
      if (addResult.error !== 'File already exists in database') {
        results.errors.push(
          `Error with ${file.relativePath}: ${addResult.error}`,
        );
      }
    }
  }

  return results;
}

/**
 * Get all media types from the database
 */
export async function getMediaTypes(): Promise<MediaType[]> {
  try {
    const supabase = createServer();
    const { data, error } = await supabase
      .from('media_types')
      .select('*')
      .order('type_name');

    if (error) {
      console.error('Error fetching media types:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getMediaTypes:', error);
    return [];
  }
}
