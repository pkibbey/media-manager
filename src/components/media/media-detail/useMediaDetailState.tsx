import type { Exif } from 'exif-reader';
import { useCallback, useEffect, useState } from 'react';
import { fileTypeCache } from '@/lib/file-type-cache';
import type { MediaItem } from '@/types/db-types';

// Local storage key for zoom preference
const ZOOM_PREFERENCE_KEY = 'media-detail-zoom-mode';

// Helper function to safely type exif_data from Json
export function getExifData(item: MediaItem): Exif | null {
  return item.exif_data as Exif | null;
}

export function getDimensionsFromExif(exifData: Exif): {
  width: number;
  height: number;
} {
  if (exifData === null) {
    return { width: 0, height: 0 };
  }

  // Try to get dimensions from Image or Photo tags
  if (exifData.Image?.ImageWidth && exifData.Image?.ImageLength) {
    return {
      width: exifData.Image?.ImageWidth,
      height: exifData.Image?.ImageLength,
    };
  }

  // Fallback to Photo tags if Image tags are not available
  if (exifData.Photo?.PixelXDimension && exifData.Photo?.PixelYDimension) {
    return {
      width: exifData.Photo?.PixelXDimension,
      height: exifData.Photo?.PixelYDimension,
    };
  }

  // If no dimensions are found, return default values
  return {
    width: 0,
    height: 0,
  };
}

export function useMediaDetailState(selectedItem: MediaItem | null) {
  const [zoomMode, setZoomMode] = useState(false);
  const [isImageFile, setIsImageFile] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  // Load zoom preference from local storage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem(ZOOM_PREFERENCE_KEY);
    if (savedPreference) {
      setZoomMode(savedPreference === 'true');
    }
  }, []);

  // Check if the selected item is an image
  useEffect(() => {
    if (selectedItem) {
      const checkIfImage = async () => {
        // Use file_type_id if available, otherwise fall back to extension
        if (selectedItem.file_type_id) {
          setIsImageFile(
            await fileTypeCache.isImageById(selectedItem.file_type_id),
          );
          const fileType = await fileTypeCache.getFileTypeById(
            selectedItem.file_type_id,
          );
          setCategory(fileType?.category || null);
        }
      };

      checkIfImage();
    }
  }, [selectedItem]);

  // Toggle zoom mode and save to local storage
  const toggleZoomMode = useCallback(() => {
    setZoomMode((prev) => {
      const newValue = !prev;
      localStorage.setItem(ZOOM_PREFERENCE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const exifData = selectedItem ? getExifData(selectedItem) : null;

  return {
    zoomMode,
    toggleZoomMode,
    isImageFile,
    category,
    exifData,
  };
}
