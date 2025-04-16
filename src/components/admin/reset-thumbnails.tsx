'use client';

import { resetAllThumbnails } from '@/app/api/actions/thumbnails';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';

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
    <div className="border bg-neutral-900 rounded-md p-6 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-medium">Reset Thumbnails</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        This will delete all thumbnail images from storage and clear the
        thumbnail path for all media items. You can generate them again using
        the thumbnail generator.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">Reset All Thumbnails</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Thumbnails</DialogTitle>
            <DialogDescription>
              This action will delete all thumbnails from storage and clear the
              thumbnail path for all media items. You will need to generate
              thumbnails again afterward. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button variant="secondary" disabled={isLoading}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Thumbnails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
