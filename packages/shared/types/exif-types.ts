import type { Tags as ExiftoolTags } from 'exiftool-vendored';

/**
 * Strongly typed interface for the specific EXIF fields we extract and use
 * Maps directly to our database schema requirements
 */
interface ExtractedExifData {
  // Camera information
  Make?: string | null;
  Model?: string | null;

  // Date/Time fields (exifr returns Date objects, exiftool returns various formats)
  DateTimeOriginal?: Date | string | null;
  CreateDate?: Date | string | null;
  DateTime?: Date | string | null;

  // GPS coordinates (can be numbers or coordinate arrays)
  GPSLatitude?: number | string | number[] | null;
  GPSLongitude?: number | string | number[] | null;
  GPSLatitudeRef?: string | null; // N/S reference
  GPSLongitudeRef?: string | null; // E/W reference
  GPSPosition?: number[] | null; // Combined GPS position array

  // Camera settings
  FNumber?: number | string | null; // Aperture
  ISO?: number | string | null;
  ExposureTime?: string | number | null;
  FocalLengthIn35mmFormat?: number | string | null;
  DigitalZoomRatio?: number | string | null;

  // Image dimensions
  ImageHeight?: number | null;
  ExifImageHeight?: number | null;
  ImageWidth?: number | null;
  ExifImageWidth?: number | null;
  Orientation?: number | null;
  Rotation?: number | null; // Alternative orientation field
  CameraOrientation?: number | null; // Another orientation alternative

  // Lens information
  LensID?: string | null;
  LensModel?: string | null;
  LensSpec?: string | null;
  LensSerialNumber?: string | null;
  LensMake?: string | null;
  Lens?: string | null; // Alternative lens field

  // Camera settings and conditions
  LightSource?: string | number | null;
  MeteringMode?: string | number | null;
  SceneCaptureType?: string | number | null;
  SubjectDistance?: number | string | null;
  FocusDistance?: number | string | null; // Alternative for subject distance
  SubjectDistanceRange?: number | string | null; // Another alternative
  FocusRange?: number | string | null; // Another focus distance alternative
  Flash?: string | number | null;
  FlashMode?: string | number | null; // Alternative flash field

  // Additional metadata (primarily from exifr)
  DOF?: string | null; // Depth of Field
  DepthOfField?: string | null; // Alternative DOF field
  HyperfocalDistance?: string | number | null; // Related to DOF
  FOV?: string | null; // Field of View
  FieldOfView?: string | null; // Alternative FOV field
  AngleOfView?: string | number | null; // Another FOV alternative
}

/**
 * Type definition for exifr output structure
 * Based on exifr documentation and actual usage patterns
 */
export interface ExifrOutput extends ExtractedExifData {
  // exifr can include unknown fields, but we constrain the known ones
  [key: string]:
    | string
    | number
    | number[]
    | Uint8Array
    | Date
    | null
    | undefined;
}

/**
 * Union type for EXIF data that can come from either library
 * ExiftoolTags is already strongly typed from the exiftool-vendored package
 */
export type ExifData = ExiftoolTags | ExifrOutput;
