import FolderList from '@/components/admin/folders/folder-list';
import { ScanFoldersTrigger } from '@/components/admin/folders/ScanFoldersTrigger';

export default function ScanPage() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
      <div className="space-y-6">
        <ScanFoldersTrigger />
        <FolderList />
      </div>
    </div>
  );
}
