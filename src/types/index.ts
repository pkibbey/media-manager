import type { Tables } from './supabase';

export interface MediaItem extends Tables<'media_items'> {}

export interface FileType extends Tables<'file_types'> {}

export interface MediaFilters {
  search: string;
  type: 'all' | 'image' | 'video' | 'data';
  dateFrom: Date | null;
  dateTo: Date | null;
  minSize: number;
  maxSize: number;
  sortBy: 'date' | 'name' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  processed: 'all' | 'yes' | 'no';
  organized: 'all' | 'yes' | 'no';
  camera: string;
  hasLocation: 'all' | 'yes' | 'no';
}

export interface ExifData {
  // Basic image information
  Make?: string; // Camera manufacturer
  Model?: string; // Camera model
  Software?: string; // Software used
  ModifyDate?: Date; // Date modified
  CreateDate?: Date; // Creation date
  DateTimeOriginal?: Date; // Original date taken

  // Camera settings
  ISO?: number; // ISO speed rating
  ShutterSpeedValue?: number; // Shutter speed
  ApertureValue?: number; // Aperture
  FocalLength?: number; // Focal length
  FocalLengthIn35mmFormat?: number; // Equivalent focal length
  LensInfo?: string[]; // Lens information
  LensMake?: string; // Lens manufacturer
  LensModel?: string; // Lens model

  // Image specifics
  ImageWidth?: number; // Image width
  ImageHeight?: number; // Image height
  Orientation?: number; // Image orientation

  // Geo location data
  latitude?: number; // GPS latitude
  longitude?: number; // GPS longitude
  GPSAltitude?: number; // GPS altitude

  // Additional metadata
  Copyright?: string; // Copyright information
  Artist?: string; // Artist/photographer
}

export interface MediaStats {
  totalMediaItems: number;
  totalSizeBytes: number;
  itemsByCategory: {
    [category: string]: number;
  };
  itemsByExtension: {
    [extension: string]: number;
  };
  processedCount: number;
  unprocessedCount: number;
  organizedCount: number;
  unorganizedCount: number;
}
