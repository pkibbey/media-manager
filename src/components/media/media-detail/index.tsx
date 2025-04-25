import { memo } from 'react';
import { useMediaSelection } from '../media-list';
import { MediaDetailContainer } from './MediaDetailContainer';

// Use memo to prevent unnecessary re-renders
const MediaDetail = memo(function MediaDetail() {
  // Get the selected item from context
  const { selectedItems } = useMediaSelection();
  const selectedItem = selectedItems.length > 0 ? selectedItems[0] : null;

  return <MediaDetailContainer selectedItem={selectedItem} />;
});

export default MediaDetail;
