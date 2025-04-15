'use client';

import {
  type BatchProgress,
  batchDeleteItems,
  batchMarkOrganized,
  streamBatchProcessExif,
} from '@/app/api/actions/batch';
import {
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  FileIcon,
  GearIcon,
  ReloadIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Progress } from '../ui/progress';

interface BatchActionBarProps {
  selectedItems: any[];
  onClearSelection: () => void;
}

export default function BatchActionBar({
  selectedItems,
  onClearSelection,
}: BatchActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Calculate how many items are already processed vs unprocessed
  const processedCount = selectedItems.filter((item) => item.processed).length;
  const unprocessedCount = selectedItems.length - processedCount;

  // Calculate how many items are already marked as organized
  const organizedCount = selectedItems.filter((item) => item.organized).length;
  const unorganizedCount = selectedItems.length - organizedCount;

  // Handle processing EXIF data for selected items
  const handleProcessExif = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setCurrentAction('process-exif');
    setProgress({
      status: 'processing',
      message: 'Starting EXIF processing...',
      processedCount: 0,
      totalCount: selectedItems.length,
    });

    try {
      // Get the IDs of the selected items
      const itemIds = selectedItems.map((item) => item.id);

      // Start streaming process for EXIF data
      const stream = await streamBatchProcessExif(itemIds);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep the last incomplete message

          for (const message of messages) {
            if (message.startsWith('data: ')) {
              const data = message.slice(6);
              try {
                const progressUpdate: BatchProgress = JSON.parse(data);
                setProgress(progressUpdate);

                // If processing is complete, we're done
                if (progressUpdate.status === 'completed') {
                  setTimeout(() => {
                    setIsProcessing(false);
                    setCurrentAction(null);
                    // Wait a moment before clearing selection to allow the user to see the completion message
                    setTimeout(onClearSelection, 1500);
                  }, 1000);
                }
              } catch (e) {
                console.error('Error parsing SSE message:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing EXIF data:', error);
      setProgress({
        status: 'error',
        message: 'Error processing EXIF data',
        error: error instanceof Error ? error.message : String(error),
      });
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentAction(null);
      }, 3000);
    }
  };

  // Handle marking items as organized
  const handleMarkOrganized = async (organized: boolean) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setCurrentAction(organized ? 'mark-organized' : 'mark-unorganized');
    setProgress({
      status: 'processing',
      message: `Marking ${selectedItems.length} items as ${organized ? 'organized' : 'unorganized'}...`,
      processedCount: 0,
      totalCount: selectedItems.length,
    });

    try {
      const itemIds = selectedItems.map((item) => item.id);
      const result = await batchMarkOrganized(itemIds, organized);

      if (result.success) {
        setProgress({
          status: 'completed',
          message: result.message,
          processedCount: result.processedCount,
          totalCount: selectedItems.length,
        });

        // Clear selection after a moment
        setTimeout(() => {
          setIsProcessing(false);
          setCurrentAction(null);
          onClearSelection();
        }, 1500);
      } else {
        setProgress({
          status: 'error',
          message: result.message,
          error: result.error,
        });
        setTimeout(() => {
          setIsProcessing(false);
          setCurrentAction(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error marking items:', error);
      setProgress({
        status: 'error',
        message: 'Error updating items',
        error: error instanceof Error ? error.message : String(error),
      });
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentAction(null);
      }, 3000);
    }
  };

  // Handle deleting items
  const handleDeleteItems = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setCurrentAction('delete');
    setConfirmDelete(false);

    setProgress({
      status: 'processing',
      message: `Deleting ${selectedItems.length} items...`,
      processedCount: 0,
      totalCount: selectedItems.length,
    });

    try {
      const itemIds = selectedItems.map((item) => item.id);
      const result = await batchDeleteItems(itemIds);

      if (result.success) {
        setProgress({
          status: 'completed',
          message: result.message,
          processedCount: result.processedCount,
          totalCount: selectedItems.length,
        });

        // Clear selection after a moment
        setTimeout(() => {
          setIsProcessing(false);
          setCurrentAction(null);
          onClearSelection();
        }, 1500);
      } else {
        setProgress({
          status: 'error',
          message: result.message,
          error: result.error,
        });
        setTimeout(() => {
          setIsProcessing(false);
          setCurrentAction(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error deleting items:', error);
      setProgress({
        status: 'error',
        message: 'Error deleting items',
        error: error instanceof Error ? error.message : String(error),
      });
      setTimeout(() => {
        setIsProcessing(false);
        setCurrentAction(null);
      }, 3000);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background shadow-lg border-t py-3 px-4 z-40">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="flex items-center gap-1"
              disabled={isProcessing}
            >
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Clear selection</span>
            </Button>
            <span className="font-medium">
              {selectedItems.length}{' '}
              {selectedItems.length === 1 ? 'item' : 'items'} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 max-w-md">
              {isProcessing && progress && (
                <div className="text-xs mr-2">
                  {progress.status === 'processing' && (
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          progress.processedCount && progress.totalCount
                            ? (progress.processedCount / progress.totalCount) *
                              100
                            : 0
                        }
                        className="h-2 w-32 sm:w-48"
                      />
                      <span>
                        {progress.processedCount}/{progress.totalCount}
                      </span>
                    </div>
                  )}
                  {progress.status === 'completed' && (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
                      <CheckIcon className="h-3 w-3" />
                      <span>{progress.message}</span>
                    </div>
                  )}
                  {progress.status === 'error' && (
                    <div className="flex items-center gap-1 text-destructive">
                      <ExclamationTriangleIcon className="h-3 w-3" />
                      <span>{progress.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* EXIF Processing Button */}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={handleProcessExif}
                disabled={isProcessing || unprocessedCount === 0}
                title={
                  unprocessedCount > 0
                    ? `Process EXIF data (${unprocessedCount} items need processing)`
                    : 'All selected items are already processed'
                }
              >
                {isProcessing && currentAction === 'process-exif' ? (
                  <ReloadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <GearIcon className="h-4 w-4" />
                )}
                <span className="sr-only sm:not-sr-only">Process EXIF</span>
                {unprocessedCount > 0 && (
                  <span className="bg-secondary text-secondary-foreground text-xs rounded-full px-1">
                    {unprocessedCount}
                  </span>
                )}
              </Button>

              {/* Mark as Organized/Unorganized Button */}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() =>
                  handleMarkOrganized(unorganizedCount >= organizedCount)
                }
                disabled={isProcessing}
              >
                {isProcessing &&
                (currentAction === 'mark-organized' ||
                  currentAction === 'mark-unorganized') ? (
                  <ReloadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <FileIcon className="h-4 w-4" />
                )}
                <span className="sr-only sm:not-sr-only">
                  {unorganizedCount >= organizedCount
                    ? 'Mark Organized'
                    : 'Mark Unorganized'}
                </span>
                {unorganizedCount > 0 &&
                  unorganizedCount < selectedItems.length && (
                    <span className="bg-secondary text-secondary-foreground text-xs rounded-full px-1">
                      {unorganizedCount}
                    </span>
                  )}
                {organizedCount > 0 &&
                  organizedCount < selectedItems.length && (
                    <span className="bg-secondary text-secondary-foreground text-xs rounded-full px-1">
                      {organizedCount}
                    </span>
                  )}
              </Button>

              {/* Delete Button */}
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setConfirmDelete(true)}
                disabled={isProcessing}
              >
                {isProcessing && currentAction === 'delete' ? (
                  <ReloadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4" />
                )}
                <span className="sr-only sm:not-sr-only">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedItems.length}{' '}
              {selectedItems.length === 1 ? 'item' : 'items'}? This action will
              only remove the items from the database, not from disk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItems}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
