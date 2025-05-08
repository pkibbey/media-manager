# Media Browsing

## Overview

The Media Browsing feature allows users to navigate, search, and filter their media collections with an intuitive interface. It's designed to handle large media libraries efficiently through pagination, virtualization, and responsive UI components.

## Architecture

### Key Components

- **MediaListContainer** - Main container handling media selection and keyboard shortcuts
- **MediaGrid** - Virtualized grid display for efficient rendering of large collections
- **MediaCard** - Individual media item display with thumbnail and basic metadata
- **MediaDetail** - Detailed view of selected media items with metadata and actions
- **MediaFilters** - Advanced filtering options for the media collection

### Data Flow

1. **Server Action**: `getMediaItems` fetches paginated items based on filters
2. **Selection Context**: `MediaSelectionContext` manages selected items across components
3. **View Components**: Display media in grid or list format with infinite scrolling
4. **Detail Panel**: Shows selected item details in a side panel

## Features

### Advanced Filtering

Users can filter media by:
- File type (image, video, data)
- Date range
- File size
- Processing status
- Metadata presence (EXIF, thumbnails, analysis)
- Hidden and deleted status

### Selection System

- Click to select individual items
- Ctrl/Cmd + Click for multi-select
- Shift + Click for range selection
- Keyboard shortcuts for bulk operations (Delete, Hide)

### Media Preview

- Instant thumbnail loading with priority for visible items
- Responsive grid layout adapting to screen size
- Detail panel with file information, EXIF data, and analysis results

### Performance Optimizations

- Paginated data fetching to minimize memory usage
- Memoized components to prevent unnecessary re-renders
- Progressive image loading with quality optimization

## Implementation

### Server Components

```
/app/browse/ - Server components for initial page rendering
/actions/browse/get-media-items.ts - Server action for fetching media
```

### Client Components

```
/components/media/media-list/ - Client components for interactive browsing
/components/media/media-detail/ - Components for detailed item view
```

### State Management

The browsing view uses context providers to manage:
- Selected items state
- Filter preferences
- View mode (grid/list)
- Sort order

### Keyboard Navigation

The browsing interface provides full keyboard accessibility:
- Arrow keys to navigate items
- Enter to view item details
- Space to toggle selection
- D key to mark selected items as deleted
- H key to hide selected items
- Ctrl+A to select all items

## Integration Points

- Connects with thumbnail generation to display previews
- Uses EXIF data for detailed information display
- Leverages Analysis data for content-based search and filtering