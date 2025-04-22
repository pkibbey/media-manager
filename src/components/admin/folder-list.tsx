import { getScanFolders } from '@/app/actions/scan';
import FolderListDisplay from './folder-list-display';

export default async function FolderList() {
  // Fetch folders directly in the server component
  const { success, data: folders, error } = await getScanFolders();

  if (!success) {
    return (
      <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
        Error loading folders: {error}
      </div>
    );
  }

  return <FolderListDisplay folders={folders || []} />;
}
