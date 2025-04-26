'use client';

import { RotateCounterClockwiseIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { toast } from 'sonner';
import { resetAllThumbnails } from '@/app/actions/thumbnails';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    } catch (error: any) {
      toast.error(
        'An unexpected error occurred while resetting thumbnails',
        error.message,
      );
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
        <CardContent className="space-y-4">
          <div>
            <Button
              variant="destructive"
              onClick={() => setDialogOpen(true)}
              disabled={isLoading}
              className="w-full"
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
          </div>
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
              onClick={async () => await handleReset()}
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
