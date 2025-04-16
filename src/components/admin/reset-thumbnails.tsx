'use client';

import { resetAllThumbnails } from '@/app/api/actions/thumbnails';
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

export default function ResetThumbnails() {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = async () => {
    try {
      setIsLoading(true);
      const result = await resetAllThumbnails();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Failed to reset thumbnails');
      }

      setDialogOpen(false);
    } catch (error) {
      toast.error('An unexpected error occurred while resetting thumbnails');
      console.error('Error resetting thumbnails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Reset Thumbnails</CardTitle>
          <CardDescription>
            This will delete all thumbnail images from storage and clear the
            thumbnail path for all media items. You can generate them again
            using the thumbnail generator.
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
              'Reset All Thumbnails'
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Thumbnails</DialogTitle>
            <DialogDescription>
              This action will delete all thumbnails from storage and clear the
              thumbnail path for all media items. You will need to generate
              thumbnails again afterward. This action cannot be undone.
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
              {isLoading ? 'Resetting...' : 'Yes, Reset All Thumbnails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
