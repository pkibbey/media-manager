'use client';

import { TrashIcon } from '@radix-ui/react-icons';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { removeScanFolder } from '@/actions/scan/remove-scan-folder';

interface FolderRemoveButtonProps {
  folderId: number;
}

export function FolderRemoveButton({ folderId }: FolderRemoveButtonProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);

    const { error, statusText } = await removeScanFolder(folderId);

    if (!error) {
      toast.success(statusText || 'Successfully removed folder from scan list');
    } else {
      toast.error(statusText || 'Failed to remove folder from scan list');
    }

    setIsRemoving(false);
  }, [folderId]);

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
