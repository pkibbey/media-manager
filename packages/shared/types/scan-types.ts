import type { MediaType } from './media-types';

export interface FileDetails {
  path: string; // Display path
  size: number;
  mediaType: Pick<MediaType, 'id' | 'mime_type'>; // Media type object
  lastModified?: number;
  name: string; // Just the filename
  buffer?: ArrayBuffer; // Optional buffer for file content analysis
}

export interface ScanResults {
  success: boolean;
  filesAdded: number;
  filesSkipped: number;
  errors: string[];
  mediaTypeStats: Record<string, number>;
}
