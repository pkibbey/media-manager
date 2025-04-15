import { type ClassValue, clsx } from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format bytes to a human-readable string
 */
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat(
    // biome-ignore lint/style/useExponentiationOperator: <explanation>
    (bytes / Math.pow(k, i)).toFixed(dm),
  )} ${sizes[i]}`;
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString: string, formatString = 'PP') {
  try {
    const date = new Date(dateString);
    return format(date, formatString);
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format a date string to a relative time (e.g. "2 days ago")
 */
export function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Parse a date from a filename (assuming format like YYYYMMDD or YYYY-MM-DD)
 */
export function parseDateFromFilename(filename: string): Date | null {
  // Match YYYYMMDD or YYYY-MM-DD or YYYY_MM_DD patterns
  const datePatterns = [
    /(\d{4})(\d{2})(\d{2})/, // YYYYMMDD
    /(\d{4})[_-](\d{2})[_-](\d{2})/, // YYYY-MM-DD or YYYY_MM_DD
  ];

  for (const pattern of datePatterns) {
    const match = filename.match(pattern);
    if (match) {
      const year = Number.parseInt(match[1], 10);
      const month = Number.parseInt(match[2], 10) - 1; // JS months are 0-indexed
      const day = Number.parseInt(match[3], 10);

      const date = new Date(year, month, day);

      // Verify the date is valid
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Check if a file format can be natively displayed in most browsers
 */
export function canDisplayNatively(extension: string): boolean {
  const lowerCaseExtension = extension.toLowerCase();
  const nativeImageFormats = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'svg',
    'webp',
    'avif',
  ];
  const nativeVideoFormats = ['mp4', 'webm', 'ogg'];
  const nativeAudioFormats = ['mp3', 'wav', 'ogg', 'aac'];
  const nativeDocumentFormats = ['pdf', 'txt'];

  return (
    nativeImageFormats.includes(lowerCaseExtension) ||
    nativeVideoFormats.includes(lowerCaseExtension) ||
    nativeAudioFormats.includes(lowerCaseExtension) ||
    nativeDocumentFormats.includes(lowerCaseExtension)
  );
}

/**
 * Check if a file needs conversion to be displayed on web
 */
export function needsConversion(extension: string): boolean {
  const formatsNeedingConversion = [
    'heic',
    'raw',
    'tiff',
    'tif',
    'nef',
    'cr2',
    'arw',
    'orf',
    'mov',
    'avi',
    'wmv',
    'mkv',
    'flv',
  ];

  return formatsNeedingConversion.includes(extension.toLowerCase());
}

/**
 * Check if a file is an image
 */
export function isImage(extension: string): boolean {
  const imageFormats = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'svg',
    'webp',
    'avif',
    'heic',
    'tiff',
    'tif',
    'raw',
    'bmp',
    'nef',
    'cr2',
    'arw',
    'orf',
  ];
  return imageFormats.includes(extension.toLowerCase());
}

/**
 * Check if a file is a video
 */
export function isVideo(extension: string): boolean {
  const videoFormats = [
    'mp4',
    'webm',
    'ogg',
    'mov',
    'avi',
    'wmv',
    'mkv',
    'flv',
    'm4v',
  ];
  return videoFormats.includes(extension.toLowerCase());
}

/**
 * Get a keyboard-accessible index from arrow key navigation in a grid
 */
export function getKeyboardNavigationIndex(
  currentIndex: number,
  key: string,
  itemsLength: number,
  columnsCount: number,
): number {
  switch (key) {
    case 'ArrowRight':
      return Math.min(currentIndex + 1, itemsLength - 1);
    case 'ArrowLeft':
      return Math.max(currentIndex - 1, 0);
    case 'ArrowDown':
      return Math.min(currentIndex + columnsCount, itemsLength - 1);
    case 'ArrowUp':
      return Math.max(currentIndex - columnsCount, 0);
    case 'Home':
      return 0;
    case 'End':
      return itemsLength - 1;
    default:
      return currentIndex;
  }
}

export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${
    // biome-ignore lint/style/useExponentiationOperator: <explanation>
    (bytes / Math.pow(1024, i)).toFixed(2)
  } ${sizes[i]}`;
}
