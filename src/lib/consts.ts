/**
 * Default page size for pagination
 */
export const PAGE_SIZE = 50;

/**
 * Default batch size for processing operations
 */
export const BATCH_SIZE = 100;

/**
 * Threshold for large files (100MB in bytes)
 * Files larger than this will be skipped in various processing operations
 */
export const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

/**
 * Threshold for small files (10Kb in bytes)
 * Files smaller than this will be skipped in various processing operations
 */
export const SMALL_FILE_THRESHOLD = 10 * 1024; // 10Kb in bytes

export const THUMBNAIL_SIZE = 300;
