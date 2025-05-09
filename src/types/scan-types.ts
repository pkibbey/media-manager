export interface FileDetails {
  path: string; // Display path
  size: number;
  type: string;
  lastModified?: number;
  name: string; // Just the filename
  relativePath: string; // Path relative to selected directory (for storage)
  buffer?: ArrayBuffer; // Optional buffer for file content analysis
}

export interface ScanResults {
  success: boolean;
  filesAdded: number;
  filesSkipped: number;
  errors: string[];
  mediaTypeStats: Record<string, number>;
}
