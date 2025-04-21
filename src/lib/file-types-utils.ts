import type { FileType } from '@/types/db-types';
import { createServerSupabaseClient } from './supabase';

export interface FileTypeInfo {
  ignoredExtensions: string[];
  extensionToCategory: Record<string, string>;
  allFileTypes: {
    extension: string;
    category: string;
    ignore: boolean | null;
  }[];
}

/**
 * Extended file type information including ID and other metadata
 */
export interface DetailedFileTypeInfo extends FileTypeInfo {
  idToFileType: Map<number, FileType>;
  extensionToId: Map<string, number>;
  categoryToIds: Record<string, number[]>;
  ignoredIds?: number[];
}

/**
 * Fetches file type information (ignored extensions, category mappings) from the database.
 * @returns An object containing processed file type information or null if an error occurs.
 */
export async function getFileTypeInfo(): Promise<FileTypeInfo | null> {
  const supabase = createServerSupabaseClient();

  // Fetch all file type information in a single query
  const { data: fileTypes, error: fileTypesError } = await supabase
    .from('file_types')
    .select('extension, category, ignore');

  if (fileTypesError || !fileTypes) {
    console.error('Error fetching file types:', fileTypesError);
    return null; // Return null or throw an error based on desired handling
  }

  // Build maps and arrays of file type information
  const ignoredExtensions: string[] = [];
  const extensionToCategory: Record<string, string> = {};
  const allFileTypes: {
    extension: string;
    category: string;
    ignore: boolean | null;
  }[] = [];

  fileTypes?.forEach((fileType) => {
    const ext = fileType.extension.toLowerCase();
    const category = fileType.category;

    allFileTypes.push({
      extension: ext,
      category: category,
      ignore: fileType.ignore,
    });

    if (fileType.ignore) {
      ignoredExtensions.push(ext);
    }

    extensionToCategory[ext] = category;
  });

  return {
    ignoredExtensions,
    extensionToCategory,
    allFileTypes, // Include the raw data if needed elsewhere
  };
}

/**
 * Fetches detailed file type information including IDs and mappings
 * @returns Enhanced file type information with ID mappings, or null if an error occurs
 */
export async function getDetailedFileTypeInfo(): Promise<DetailedFileTypeInfo | null> {
  const supabase = createServerSupabaseClient();

  // Fetch all file type information in a single query with all fields
  const { data: fileTypes, error: fileTypesError } = await supabase
    .from('file_types')
    .select('*');

  if (fileTypesError || !fileTypes) {
    console.error('Error fetching detailed file types:', fileTypesError);
    return null;
  }

  // Build basic FileTypeInfo first
  const ignoredExtensions: string[] = [];
  const extensionToCategory: Record<string, string> = {};
  const allFileTypes: {
    extension: string;
    category: string;
    ignore: boolean | null;
  }[] = [];

  // Additional maps for ID-based lookups
  const idToFileType = new Map<number, FileType>();
  const extensionToId = new Map<string, number>();
  const categoryToIds: Record<string, number[]> = {};
  const ignoredIds: number[] = [];

  fileTypes.forEach((fileType) => {
    const ext = fileType.extension.toLowerCase();
    const category = fileType.category;

    // Build the basic FileTypeInfo data
    allFileTypes.push({
      extension: ext,
      category: category,
      ignore: fileType.ignore,
    });

    if (fileType.ignore) {
      ignoredExtensions.push(ext);
      ignoredIds.push(fileType.id);
    }

    extensionToCategory[ext] = category;

    // Add to the ID maps
    idToFileType.set(fileType.id, fileType);
    extensionToId.set(ext, fileType.id);

    // Add to category-to-ids mapping
    if (!categoryToIds[category]) {
      categoryToIds[category] = [];
    }
    categoryToIds[category].push(fileType.id);
  });

  return {
    ignoredExtensions,
    extensionToCategory,
    allFileTypes,
    idToFileType,
    extensionToId,
    categoryToIds,
    ignoredIds: ignoredIds.length > 0 ? ignoredIds : undefined,
  };
}

/**
 * Get file type information by ID
 * @param fileTypeId - The ID of the file type to fetch
 * @returns File type object or null if not found
 */
export async function getFileTypeById(
  fileTypeId: number,
): Promise<FileType | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('file_types')
    .select('*')
    .eq('id', fileTypeId)
    .single();

  if (error || !data) {
    console.error(`Error fetching file type with ID ${fileTypeId}:`, error);
    return null;
  }

  return data as FileType;
}

/**
 * Helper functions that replace direct extension checks
 */

/**
 * Check if a file is an image based on file type ID
 * @param fileTypeId - The file type ID to check
 * @returns True if the file type is an image
 */
export async function isImageById(fileTypeId: number | null): Promise<boolean> {
  if (!fileTypeId) return false;

  const fileType = await getFileTypeById(fileTypeId);
  return fileType?.category === 'image' || fileType?.category === 'raw_image';
}

/**
 * Check if a file is a video based on file type ID
 * @param fileTypeId - The file type ID to check
 * @returns True if the file type is a video
 */
export async function isVideoById(fileTypeId: number | null): Promise<boolean> {
  if (!fileTypeId) return false;

  const fileType = await getFileTypeById(fileTypeId);
  return fileType?.category === 'video';
}

/**
 * Check if a file needs conversion based on file type ID
 * @param fileTypeId - The file type ID to check
 * @returns True if the file type needs conversion
 */
export async function needsConversionById(
  fileTypeId: number | null,
): Promise<boolean> {
  if (!fileTypeId) return false;

  const fileType = await getFileTypeById(fileTypeId);
  return fileType?.needs_conversion === true;
}

/**
 * Get the MIME type for a file based on file type ID
 * @param fileTypeId - The file type ID to check
 * @returns The MIME type if available, or null
 */
export async function getMimeTypeById(
  fileTypeId: number | null,
): Promise<string | null> {
  if (!fileTypeId) return null;

  const fileType = await getFileTypeById(fileTypeId);
  return fileType?.mime_type || null;
}
