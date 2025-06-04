# Queue Reset Feature

## Overview

This feature introduces the ability to reset individual queue states for each queue in the media manager system. Users can now reset specific queue states (waiting, completed, failed, etc.) individually instead of resetting the entire queue.

## Implementation

### API Endpoint

- **Route**: `/api/admin/queue-reset`
- **Method**: `POST`
- **Parameters**: 
  - `queueName` (query parameter): Name of the queue to reset
  - `state` (query parameter): State to reset (waiting, active, completed, failed, delayed, paused, waiting-children, prioritized)

**Example Usage**:
```
POST /api/admin/queue-reset?queueName=thumbnailQueue&state=completed
```

### UI Component

**File**: `/src/components/admin/queue-reset-button.tsx`

A reusable component that provides a dropdown interface for selecting and resetting individual queue states.

**Features**:
- Select from 8 different queue states
- Descriptive labels for each state
- Loading states and error handling
- Integrated with existing admin UI design

### Integration

The Queue Reset Button has been integrated into the following admin pages:

1. **Thumbnails** (`/admin/thumbnails`) - `thumbnailQueue`
2. **Advanced Analysis** (`/admin/advanced`) - `advancedAnalysisQueue`
3. **Duplicates** (`/admin/duplicates`) - `duplicatesQueue`
4. **EXIF** (`/admin/exif`) - `exifQueue`
5. **Content Warnings** (`/admin/warnings`) - `contentWarningsQueue`
6. **Objects** (`/admin/objects`) - `objectAnalysisQueue`

### Queue States Available

- **waiting**: Jobs waiting to be processed
- **active**: Currently running jobs
- **completed**: Successfully completed jobs
- **failed**: Failed jobs
- **delayed**: Delayed jobs
- **paused**: Paused jobs
- **waiting-children**: Jobs waiting for child jobs
- **prioritized**: Prioritized jobs

## Usage

1. Navigate to any queue admin page (e.g., `/admin/thumbnails`)
2. In the "Queue State Management" section, select the desired state from the dropdown
3. Click the "Reset" button to reset jobs in that specific state
4. The system will remove all jobs in the selected state from the queue

## Technical Details

### Backend Function

The feature uses the existing `resetQueueState` function in `/src/actions/admin/reset-queue-state.ts` which:
- Validates the state parameter against allowed BullMQ job states
- Uses BullMQ's `queue.clean()` method to remove jobs by state
- Handles different state mappings (e.g., 'waiting' maps to 'wait' in BullMQ)
- Returns success/failure status

### Error Handling

- Invalid queue names return 400 error
- Invalid states return 400 error  
- BullMQ errors are caught and returned as 500 errors
- Frontend displays console messages for success/error states

## Benefits

1. **Granular Control**: Reset specific queue states instead of entire queues
2. **Improved Debugging**: Clear specific problematic states without affecting others
3. **Better Performance**: Avoid resetting successfully completed jobs when only clearing failed ones
4. **User Experience**: Simple dropdown interface integrated into existing admin pages
5. **Consistency**: Same interface pattern across all queue management pages
