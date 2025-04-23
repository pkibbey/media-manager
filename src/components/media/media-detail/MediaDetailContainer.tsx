import type { MediaItem } from '@/types/db-types';
import MediaFullView from '../media-full-view';
import { MediaDetailEmpty } from './MediaDetailEmpty';
import { MediaDetailHeader } from './MediaDetailHeader';
import { MediaDetailTabs } from './MediaDetailTabs';
import { useMediaDetailState } from './useMediaDetailState';

type MediaDetailContainerProps = {
  selectedItem: MediaItem | null;
};

export function MediaDetailContainer({
  selectedItem,
}: MediaDetailContainerProps) {
  const { zoomMode, toggleZoomMode, isImageFile, category, exifData } =
    useMediaDetailState(selectedItem);

  if (!selectedItem) {
    return <MediaDetailEmpty />;
  }

  return (
    <div className="sticky top-6 flex flex-col">
      <div className="relative overflow-hidden bg-background">
        <MediaDetailHeader
          isImageFile={isImageFile}
          zoomMode={zoomMode}
          toggleZoomMode={toggleZoomMode}
        />
        <div
          className={`w-full h-full flex items-center justify-center overflow-hidden ${
            zoomMode ? 'media-zoom-mode' : ''
          }`}
        >
          <MediaFullView item={selectedItem} zoomMode={zoomMode} />
        </div>
      </div>

      <MediaDetailTabs
        item={selectedItem}
        category={category}
        exifData={exifData}
        isImageFile={isImageFile}
      />
    </div>
  );
}
