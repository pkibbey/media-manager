'use client';

import { AlertCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { clearAllExifData } from '@/actions/exif/clear-all-exif';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ResetExifData() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClearExifData = async () => {
    setIsLoading(true);

    try {
      const result = await clearAllExifData();

      if (result.error) {
        toast.error('Failed to clear EXIF data', {
          description: result.error.message,
        });
      } else if (result.data[0].affected_rows === 0) {
        toast.success('EXIF data cleared successfully', {
          description: result.data[0].affected_rows,
        });
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <Trash2 className="h-5 w-5 mr-2" /> Clear All EXIF Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">
            This will remove all EXIF metadata from all images in the database.
            This operation cannot be undone. You will need to re-extract EXIF
            data if you wish to restore it.
          </p>
          <Button
            variant="destructive"
            onClick={() => setIsDialogOpen(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Clear All EXIF Data'}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-destructive" />
              Confirm EXIF Data Removal
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove all EXIF metadata from all images in your
              database.
              <br />
              <br />
              <strong>This operation cannot be undone.</strong> You will need to
              re-process images to restore EXIF data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleClearExifData();
              }}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Processing...' : 'Yes, Clear All EXIF Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
