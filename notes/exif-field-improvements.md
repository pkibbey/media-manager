# EXIF Field Extraction Improvements

## Overview

Enhanced the EXIF data extraction to include alternative field mappings for the following fields that were returning null values:

- `depth_of_field`
- `field_of_view` 
- `gps_latitude`
- `gps_longitude`
- `lens_id`
- `lens_model`
- `orientation`
- `subject_distance`

## Changes Made

### 1. Enhanced GPS Coordinate Extraction

**New Function:** `extractGPSCoordinateEnhanced()`
- Handles GPS reference directions (N/S/E/W)
- Properly applies negative values for South and West coordinates
- Fallback to original extraction method if enhanced fails

**Alternative GPS Fields Added:**
- `GPSLatitudeRef` - North/South reference
- `GPSLongitudeRef` - East/West reference  
- `GPSPosition` - Combined GPS position array

### 2. Expanded Lens Information Fields

**Additional lens fields now checked:**
- `LensID` (existing)
- `LensModel` (existing)
- `LensSpec` (existing)
- `LensSerialNumber` (new)
- `LensMake` (new)
- `Lens` (new alternative)

### 3. Enhanced Orientation Detection

**Alternative orientation fields:**
- `Orientation` (existing)
- `Rotation` (new alternative)
- `CameraOrientation` (new alternative)

### 4. Improved Subject Distance Extraction

**Additional distance fields:**
- `SubjectDistance` (existing)
- `FocusDistance` (new alternative)
- `SubjectDistanceRange` (new alternative)
- `FocusRange` (new alternative)

### 5. Enhanced Depth of Field Detection

**Alternative DOF fields:**
- `DOF` (existing)
- `DepthOfField` (new alternative)
- `HyperfocalDistance` (new alternative, related to DOF)

### 6. Improved Field of View Extraction

**Alternative FOV fields:**
- `FOV` (existing)
- `FieldOfView` (new alternative)
- `AngleOfView` (new alternative)

### 7. Additional Flash Information

**Alternative flash fields:**
- `Flash` (existing)
- `FlashMode` (new alternative)

## Type Safety Improvements

Updated the EXIF type definitions in `/packages/shared/types/exif-types.ts` to include all new alternative fields while maintaining type safety.

## Debug Function

Added `debugExifFields()` function to help identify what EXIF fields are actually available in your media files:

```typescript
debugExifFields(exif, mediaPath);
```

This function categorizes and logs all available EXIF fields by type:
- GPS-related fields
- Lens-related fields  
- Orientation/rotation fields
- Distance/focus fields
- Depth of field fields
- Field of view/angle fields
- Flash-related fields
- Other fields

## How to Use the Debug Function

### Temporary Debugging Mode

You can enable debugging on a few sample files by modifying the EXIF processing:

```typescript
// In your EXIF processing code, temporarily enable debug mode
const success = await processExifFast(mediaItem, true); // Enable debug
```

### Recommended Debugging Process

1. **Select Representative Sample Files:**
   - Choose 5-10 media files from different cameras/sources
   - Include files that you know should have the missing data

2. **Enable Debug Mode Temporarily:**
   - Modify `processExifFast()` calls to include `enableDebug: true`
   - Run processing on your sample files

3. **Analyze Debug Output:**
   - Look for fields containing GPS, lens, orientation, distance, depth, or field data
   - Note any field names that aren't currently being extracted

4. **Update Field Mappings:**
   - Add any discovered fields to the extraction logic
   - Update type definitions if needed

## Expected Improvements

With these enhancements, you should see:

1. **Better GPS Coordinate Extraction:**
   - Proper handling of hemisphere indicators
   - Support for different GPS coordinate formats

2. **More Comprehensive Lens Information:**
   - Fallback to alternative lens identification fields
   - Support for manufacturer-specific lens fields

3. **Enhanced Orientation Detection:**
   - Multiple sources for image orientation data
   - Better support across different camera manufacturers

4. **Improved Distance Measurements:**
   - Multiple focus/distance field sources
   - Support for different distance measurement formats

5. **Better Depth and Field of View Data:**
   - Alternative field sources for calculated values
   - Support for related optical measurements

## Further Investigation

If fields are still coming back null after these improvements:

1. **Run the debug function** on a representative sample of your media files
2. **Check manufacturer-specific MakerNote fields** - some data might be in proprietary formats
3. **Consider using ExifTool** for files with complex metadata - it has more comprehensive manufacturer support
4. **Verify the source cameras** actually record this data - not all cameras capture all metadata fields

## Files Modified

- `/packages/workers/exif/exif-utils.ts` - Enhanced extraction logic
- `/packages/shared/types/exif-types.ts` - Updated type definitions  
- `/packages/workers/exif/process-exif-fast.ts` - Added debug mode support
