/**
 * Default page size for pagination
 */
export const PAGE_SIZE = 50;

/**
 * Default thumbnail size for image processing
 * This is used for generating thumbnails
 */
export const THUMBNAIL_SIZE = 224;

// Percentage quality for JPEG thumbnails
export const THUMBNAIL_QUALITY = 90;

export const VISION_MODEL = 'gemma3:4b';

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

export const IMAGE_DETAIL_SIZE = 600; // Size for image detail view

export const BACKGROUND_COLOR = { r: 23, g: 23, b: 23, alpha: 1 }; // Transparent background for thumbnails

export const MAX_BATCH_SIZE = 100; // Maximum batch size for processing

export const DEFAULT_CONCURRENCY = 5;
