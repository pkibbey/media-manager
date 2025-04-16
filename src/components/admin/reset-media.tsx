'use client';

import { resetAllMediaItems } from '@/app/api/actions/stats';
import { RotateCounterClockwiseIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export function ResetMedia() {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    setShowConfirmDialog(false);

    try {
      const result = await resetAllMediaItems();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(`Failed to reset media items: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Reset Media Items</CardTitle>
          <CardDescription>
            Reset the processed state of all media items in the database. This
            will mark all items as unprocessed, allowing them to be processed
            again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setShowConfirmDialog(true)}
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset All Media Items'
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Media Items?</DialogTitle>
            <DialogDescription>
              This action will mark all media items as unprocessed. You'll need
              to run the exifData processing again to extract EXIF data. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Yes, Reset All Items'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ResetMedia;
