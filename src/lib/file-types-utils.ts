import { getAllFileTypes } from '@/actions/file-types/get-all-file-types';
import type { FileType } from '@/types/db-types';

interface FileTypeInfo {
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
 * Fetches detailed file type information including IDs and mappings
 * @returns Enhanced file type information with ID mappings, or null if an error occurs
 */
export async function getDetailedFileTypeInfo(): Promise<DetailedFileTypeInfo | null> {
  // Use the query helper to get all file types with all fields
  const { data: fileTypes, error } = await getAllFileTypes();

  if (error || !fileTypes) {
    console.error('Error fetching detailed file types:', error);
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
    // Add to allFileTypes array
    allFileTypes.push({
      extension: fileType.extension,
      category: fileType.category || 'Other',
      ignore: fileType.ignore,
    });

    // Process ignored extensions
    if (fileType.ignore) {
      ignoredExtensions.push(fileType.extension);
      ignoredIds.push(fileType.id);
    }

    // Map extension to category
    extensionToCategory[fileType.extension] = fileType.category || 'Other';

    // ID-based lookups
    idToFileType.set(fileType.id, fileType);
    extensionToId.set(fileType.extension, fileType.id);

    // Group by category
    const category = fileType.category || 'Other';
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
    ignoredIds,
  };
}

/**
 * Helper functions that replace direct extension checks
 */

/**
 * Determine the appropriate MIME type from a file extension
 * @param extension - The file extension (without the dot)
 * @returns The appropriate MIME type for the extension
 */
export function getMimeTypeByExtension(extension: string): string {
  const ext = extension.toLowerCase();

  // Common image formats
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'avif') return 'image/avif';
  if (ext === 'bmp') return 'image/bmp';
  if (ext === 'svg') return 'image/svg+xml';

  // Raw image formats
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  if (ext === 'tiff' || ext === 'tif') return 'image/tiff';
  if (['raw', 'arw', 'cr2', 'nef', 'orf', 'rw2', 'dng'].includes(ext))
    return `image/x-${ext}`;

  // Video formats
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'avi') return 'video/x-msvideo';
  if (ext === 'mkv') return 'video/x-matroska';
  if (ext === 'mpg' || ext === 'mpeg') return 'video/mpeg';
  if (ext === 'm4v') return 'video/x-m4v';
  if (ext === 'wmv') return 'video/x-ms-wmv';
  if (ext === 'flv') return 'video/x-flv';

  // Audio formats
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg') return 'audio/ogg';
  if (ext === 'flac') return 'audio/flac';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'wma') return 'audio/x-ms-wma';
  if (ext === 'm4a') return 'audio/mp4';

  // Document formats
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'xlsx')
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'ppt') return 'application/vnd.ms-powerpoint';
  if (ext === 'pptx')
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (ext === 'txt') return 'text/plain';

  // Data formats
  if (ext === 'json') return 'application/json';
  if (ext === 'xml') return 'application/xml';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'yaml' || ext === 'yml') return 'application/yaml';

  // Default fallback
  return 'application/octet-stream';
}

/**
 * Determine the appropriate category for a file extension
 * @param extension - The file extension (without the dot)
 * @returns The appropriate category for the extension
 */
export function getCategoryByExtension(extension: string): string {
  const ext = extension.toLowerCase();

  // Image formats
  if (
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg', 'ico'].includes(
      ext,
    )
  ) {
    return 'image';
  }

  // Raw image formats
  if (
    [
      'heic',
      'heif',
      'tiff',
      'tif',
      'raw',
      'arw',
      'cr2',
      'nef',
      'orf',
      'rw2',
      'dng',
    ].includes(ext)
  ) {
    return 'raw_image';
  }

  // Video formats
  if (
    [
      'mp4',
      'webm',
      'mov',
      'avi',
      'mkv',
      'mpg',
      'mpeg',
      'm4v',
      'wmv',
      'flv',
      '3gp',
      'ogv',
    ].includes(ext)
  ) {
    return 'video';
  }

  // Audio formats
  if (
    ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'opus', 'aiff'].includes(
      ext,
    )
  ) {
    return 'audio';
  }

  // Document formats
  if (
    [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'rtf',
      'odt',
      'ods',
      'odp',
    ].includes(ext)
  ) {
    return 'document';
  }

  // Archive formats
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'xz'].includes(ext)) {
    return 'archive';
  }

  // Data formats
  if (['json', 'xml', 'csv', 'yaml', 'yml'].includes(ext)) {
    return 'data';
  }

  // Code/text formats
  if (
    [
      'html',
      'css',
      'js',
      'ts',
      'jsx',
      'tsx',
      'php',
      'py',
      'java',
      'c',
      'cpp',
      'h',
      'rb',
      'go',
      'rs',
      'sh',
    ].includes(ext)
  ) {
    return 'code';
  }

  // Executable formats
  if (['exe', 'dll', 'bat', 'cmd', 'app', 'dmg', 'deb', 'rpm'].includes(ext)) {
    return 'executable';
  }

  // Font formats
  if (['ttf', 'otf', 'woff', 'woff2', 'eot'].includes(ext)) {
    return 'font';
  }

  // 3D model formats
  if (
    ['obj', 'fbx', 'dae', 'blend', 'stl', '3ds', 'glb', 'gltf'].includes(ext)
  ) {
    return '3d_model';
  }

  // Default fallback
  return 'unknown';
}
