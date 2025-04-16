'use client';

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

export default function ResetScan() {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = async () => {
    try {
      setIsLoading(true);

      // First, delete all media items
      const mediaItemsResponse = await fetch('/api/media/reset-scan', {
        method: 'DELETE',
      });

      if (!mediaItemsResponse.ok) {
        const error = await mediaItemsResponse.text();
        throw new Error(error || 'Failed to reset media database');
      }

      const result = await mediaItemsResponse.json();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || 'Failed to reset media database');
      }

      setDialogOpen(false);
    } catch (error) {
      toast.error(
        'An unexpected error occurred while resetting media database',
      );
      console.error('Error resetting media database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-medium">Reset Media Database</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        This will delete all media items and file types from the database. Scan
        folders configuration will be preserved. You'll need to scan your
        folders again to rebuild the database.
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">Reset Media Database</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Media Database</DialogTitle>
            <DialogDescription>
              This action will delete all media items and file types from the
              database. Your scan folder configuration will be preserved, but
              you'll need to scan your folders again to rebuild the database.
              This action cannot be undone.
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
              {isLoading ? 'Resetting...' : 'Reset Database'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
