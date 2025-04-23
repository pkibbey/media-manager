'use client';

import type { MediaItem } from '@/types/db-types';
import { MediaListContainer } from './media-list/MediaListContainer';
import {
  MediaSelectionContext,
  useMediaSelection,
} from './media-list/MediaSelectionContext';

interface MediaListProps {
  items: MediaItem[];
  filterComponent?: React.ReactNode;
}

export default function MediaList({ items, filterComponent }: MediaListProps) {
  return <MediaListContainer items={items} filterComponent={filterComponent} />;
}

// Export the context and hook for use in other components
export { MediaSelectionContext, useMediaSelection };
