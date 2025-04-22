import AddFolderForm from '@/components/admin/add-folder-form';
import FolderList from '@/components/admin/folder-list';
import ResetEverything from '@/components/admin/reset-everything';
import { Suspense } from 'react';

export default function FoldersPage() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
      <div className="space-y-6">
        <AddFolderForm />
        <Suspense fallback={<div>Loading folders...</div>}>
          <FolderList />
        </Suspense>
      </div>
      <ResetEverything />
    </div>
  );
}
