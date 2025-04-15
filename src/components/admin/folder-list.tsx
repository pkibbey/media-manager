'use client';

import { removeScanFolder } from '@/app/api/actions/scan-folders';
import type { ScanFolder } from '@/types/supabase';
import { TrashIcon } from '@radix-ui/react-icons';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface FolderListProps {
  folders: ScanFolder[];
}

export default function FolderList({ folders }: FolderListProps) {
  const [isRemoving, setIsRemoving] = useState<number | null>(null);

  const handleRemove = async (id: number) => {
    setIsRemoving(id);
    try {
      await removeScanFolder(id);
    } catch (error) {
      console.error('Error removing folder:', error);
    } finally {
      setIsRemoving(null);
    }
  };

  if (folders.length === 0) {
    return (
      <div className="text-center p-4 border rounded-md bg-muted">
        No folders configured. Add a folder to begin scanning.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium">Configured Folders</h3>
      <ul className="space-y-2">
        {folders.map((folder) => (
          <li
            key={folder.id}
            className="p-3 border rounded-md bg-card flex justify-between items-center"
          >
            <div className="space-y-1">
              <p className="font-medium break-all">{folder.path}</p>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>
                  {folder.include_subfolders
                    ? 'Including subfolders'
                    : 'Excluding subfolders'}
                </span>
                {folder.last_scanned && (
                  <span>
                    • Last scanned{' '}
                    {formatDistanceToNow(new Date(folder.last_scanned))} ago
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleRemove(folder.id)}
              disabled={isRemoving === folder.id}
              className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
              aria-label="Remove folder"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
