'use client';

import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { updateFolderScanStatus } from '@/app/actions/scan';
import { Button } from '@/components/ui/button';

interface FolderResetScanStatusProps {
  folderId: number;
  isScanned: boolean;
}

export function FolderResetScanStatusButton({
  folderId,
  isScanned,
}: FolderResetScanStatusProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleResetStatus = async () => {
    if (!isScanned) return; // Only allow resetting if the folder has been scanned

    setIsResetting(true);
    try {
      const result = await updateFolderScanStatus(folderId, true);

      if (result.success) {
        toast.success(
          'Scan status reset - Folder will be included in the next scan.',
        );
      } else {
        toast.error('Failed to reset scan status - An error occurred');
      }
    } catch (error: any) {
      toast.error(`Failed to reset scan status${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Only show the button if the folder has been scanned
  if (!isScanned) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResetStatus}
      disabled={isResetting}
      title="Reset scan status"
    >
      <RotateCcw className="h-4 w-4" />
      <span className="sr-only">Reset scan status</span>
    </Button>
  );
}
