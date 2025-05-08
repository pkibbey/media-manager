/**
 * Default page size for pagination
 */
export const PAGE_SIZE = 50;

/**
 * Default batch size for processing operations
 */
export const BATCH_SIZE = 100;

/**
 * Default thumbnail size for image processing
 * This is used for generating thumbnails
 */
export const THUMBNAIL_SIZE = 224;

export const VISION_MODEL = 'minicpm-v:latest';

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
