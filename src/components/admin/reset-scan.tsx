'use client';

import { RotateCounterClockwiseIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { toast } from 'sonner';
import { clearAllMediaItems } from '@/app/actions/exif';
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

export default function ResetScan() {
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleResetScan = async () => {
    try {
      setIsLoading(true);

      await clearAllMediaItems();

      toast.success(
        'Media database reset successfully. Scan folders configuration preserved.',
      );
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        `An unexpected error occurred while resetting media database, ${error}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Reset Scan</CardTitle>
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
              'Reset Scan'
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Scan</DialogTitle>
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
              onClick={handleResetScan}
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
