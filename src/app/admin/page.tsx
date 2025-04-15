import AddFolderForm from '@/components/admin/add-folder-form';
import FolderList from '@/components/admin/folder-list';
import ScanFoldersTrigger from '@/components/admin/scan-folders-trigger';
import { Suspense } from 'react';
import { getScanFolders } from '../api/actions/scan-folders';

export default async function AdminPage() {
  const { success, data: folders, error } = await getScanFolders();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="grid gap-8">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Scan Folders</h2>
          <p className="text-muted-foreground">
            Configure folders to scan for media files. These folders will be
            scanned when you run a scan operation.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <AddFolderForm />
            </div>
            <div>
              <Suspense fallback={<div>Loading folders...</div>}>
                {success ? (
                  <FolderList folders={folders || []} />
                ) : (
                  <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
                    Error loading folders: {error}
                  </div>
                )}
              </Suspense>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Actions</h2>
          <p className="text-muted-foreground">
            Run operations on your media collection.
          </p>
          <div className="flex flex-col gap-4">
            <ScanFoldersTrigger />
            {/* More actions will be added here in the future */}
          </div>
        </section>
      </div>
    </div>
  );
}
