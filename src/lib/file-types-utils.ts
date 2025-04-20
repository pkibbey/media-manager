import { createServerSupabaseClient } from './supabase';

export interface FileTypeInfo {
  ignoredExtensions: string[];
  extensionToCategory: Record<string, string>;
  categorizedExtensions: Record<string, string[]>;
  allFileTypes: {
    extension: string;
    category: string;
    ignore: boolean | null;
  }[];
}

/**
 * Fetches file type information (ignored extensions, category mappings) from the database.
 * @param supabase - The Supabase client instance.
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
  const categorizedExtensions: Record<string, string[]> = {};
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

    if (!categorizedExtensions[category]) {
      categorizedExtensions[category] = [];
    }
    categorizedExtensions[category].push(ext);
  });

  return {
    ignoredExtensions,
    extensionToCategory,
    categorizedExtensions,
    allFileTypes, // Include the raw data if needed elsewhere
  };
}
