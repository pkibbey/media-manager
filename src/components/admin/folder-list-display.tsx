import { FolderRemoveButton } from '@/components/admin/folder-remove-button';
import type { ScanFolder } from '@/types/db-types';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

interface FolderListDisplayProps {
  folders: ScanFolder[];
}

export default function FolderListDisplay({ folders }: FolderListDisplayProps) {
  if (folders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            No folders configured. Add a folder to begin scanning.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Locations</CardTitle>
        <CardDescription>
          These folders will be scanned for media files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {folders.map((folder) => (
            <li
              key={folder.id}
              className="bg-secondary px-3 py-2 border rounded-md flex justify-between items-center"
            >
              <div className="space-y-1/2">
                <p className="text-sm font-medium break-all">{folder.path}</p>
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

              {/* Client component for the remove button */}
              <FolderRemoveButton folderId={folder.id} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
