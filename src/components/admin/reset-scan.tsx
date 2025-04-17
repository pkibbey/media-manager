'use client';

import { clearAllMediaItems } from '@/app/actions/stats';
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

export default function ResetScan() {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = async () => {
    try {
      setIsLoading(true);

      // Use the direct server action instead of fetch
      const result = await clearAllMediaItems();

      if (result.success) {
        toast.success(result.message);
        setDialogOpen(false);
      } else {
        toast.error(result.error || 'Failed to reset media database');
      }
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Reset Media Database</CardTitle>
          <CardDescription>
            This will delete all media items and file types from the database.
            Scan folders configuration will be preserved. You'll need to scan
            your folders again to rebuild the database.
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
              'Reset Media Database'
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              {isLoading ? 'Resetting...' : 'Yes, Reset Database'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
