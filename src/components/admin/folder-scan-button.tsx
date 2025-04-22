'use client';

import { scanFolders } from '@/app/actions/scan';
import { ScanSearchIcon } from 'lucide-react';
import { useState } from 'react';

interface FolderScanButtonProps {
  folderId: number;
}

export function FolderScanButton({ folderId }: FolderScanButtonProps) {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await scanFolders({ folderId });
    } catch (error) {
      console.error('Error Scanning folder:', error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <button
      onClick={handleScan}
      disabled={isScanning}
      className="p-2 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
      aria-label="Scan folder"
    >
      <ScanSearchIcon className="h-4 w-4" />
    </button>
  );
}
