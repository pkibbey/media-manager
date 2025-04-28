import { getScanFolders } from '@/app/actions/scan/get-scan-folders';
import FolderListDisplay from './folder-list-display';

export default async function FolderList() {
  const { data: folders, error } = await getScanFolders();

  if (error) {
    return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        Error loading folders: {error.message || 'Unknown error'}
      </div>
    );
  }

  return <FolderListDisplay folders={folders || []} />;
}
