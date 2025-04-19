'use client';

import { removeScanFolder } from '@/app/actions/scan-folders';
import { TrashIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

interface FolderRemoveButtonProps {
  folderId: number;
}

export function FolderRemoveButton({ folderId }: FolderRemoveButtonProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await removeScanFolder(folderId);
    } catch (error) {
      console.error('Error removing folder:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={isRemoving}
      className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
      aria-label="Remove folder"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
