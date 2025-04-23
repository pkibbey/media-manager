'use client';

import MediaDetail from './media-detail/index';

// Re-export the component as default
export default MediaDetail;

// Re-export helper functions to maintain backwards compatibility
export {
  getDimensionsFromExif,
  getExifData,
} from './media-detail/useMediaDetailState';
