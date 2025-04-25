import type { FileType } from '@/types/db-types';
import {
  type DetailedFileTypeInfo,
  getDetailedFileTypeInfo,
} from './file-types-utils';

/**
 * A cache for file type information to reduce database queries
 */
class FileTypeCache {
  private cache: DetailedFileTypeInfo | null = null;
  private lastFetchTime = 0;
  private readonly cacheTTL = 60 * 1000; // 1 minute TTL
  private fetchPromise: Promise<DetailedFileTypeInfo | null> | null = null;

  /**
   * Get the detailed file type information, either from cache or from the database
   */
  async getDetailedInfo(): Promise<DetailedFileTypeInfo | null> {
    const now = Date.now();

    // If the cache is valid, return it
    if (this.cache && now - this.lastFetchTime < this.cacheTTL) {
      return this.cache;
    }

    // If a fetch is already in progress, wait for it
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Otherwise, fetch from the database
    this.fetchPromise = getDetailedFileTypeInfo();

    try {
      const result = await this.fetchPromise;
      if (result) {
        this.cache = result;
        this.lastFetchTime = now;
      }
      return result;
    } finally {
      this.fetchPromise = null;
    }
  }

  /**
   * Get file type by ID
   */
  async getFileTypeById(id: number): Promise<FileType | null> {
    const info = await this.getDetailedInfo();
    return info?.idToFileType.get(id) || null;
  }

  /**
   * Check if a file is an image based on file type ID
   */
  async isImageById(fileTypeId: number | null): Promise<boolean> {
    if (!fileTypeId) return false;
    const fileType = await this.getFileTypeById(fileTypeId);
    return fileType?.category === 'image' || fileType?.category === 'raw_image';
  }

  /**
   * Check if a file is a video based on file type ID
   */
  async isVideoById(fileTypeId: number | null): Promise<boolean> {
    if (!fileTypeId) return false;
    const fileType = await this.getFileTypeById(fileTypeId);
    return fileType?.category === 'video';
  }

  /**
   * Check if a file needs conversion based on file type ID
   */
  async needsConversionById(fileTypeId: number | null): Promise<boolean> {
    if (!fileTypeId) return false;
    const fileType = await this.getFileTypeById(fileTypeId);
    return fileType?.needs_conversion === true;
  }

  /**
   * Get the MIME type for a file based on file type ID
   */
  async getMimeTypeById(fileTypeId: number | null): Promise<string | null> {
    if (!fileTypeId) return null;
    const fileType = await this.getFileTypeById(fileTypeId);
    return fileType?.mime_type || null;
  }

  /**
   * Force refresh the cache
   */
  async refreshCache(): Promise<void> {
    this.cache = null;
    await this.getDetailedInfo();
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = null;
    this.lastFetchTime = 0;
  }
}

// Export a singleton instance
export const fileTypeCache = new FileTypeCache();
