'use client';

import { resetDetectionData } from '@/app/actions/detection';
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

export default function ResetDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = async () => {
    try {
      setIsLoading(true);

      // Call the server action directly
      const result = await resetDetectionData();

      if (result.success) {
        toast.success(result.message || 'Detection data has been reset');
        setDialogOpen(false);
      } else {
        toast.error(result.error || 'Failed to reset detection data');
      }
    } catch (error) {
      toast.error(
        'An unexpected error occurred while resetting detection data',
      );
      console.error('Error resetting detection data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Reset Detection Data</CardTitle>
          <CardDescription>
            This will delete all detection analysis data including keywords and
            object detection results. Media files and other metadata will be
            preserved. You'll need to run analysis again to regenerate detection
            data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDialogOpen(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RotateCounterClockwiseIcon className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Detection Data'
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Detection Data</DialogTitle>
            <DialogDescription>
              This action will delete all image recognition data including
              keywords and detected objects. Your media files and other metadata
              will be preserved, but you'll need to run detection analysis again
              to rebuild detection data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Yes, Reset Detection Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
