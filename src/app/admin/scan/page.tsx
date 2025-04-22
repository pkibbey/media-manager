import FolderList from '@/components/admin/folder-list';
import ResetScan from '@/components/admin/reset-scan';
import ScanFoldersTrigger from '@/components/admin/scan-folders-trigger';

export default function ScanPage() {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-[2fr_1fr] items-start gap-6">
      <div className="space-y-6">
        <ScanFoldersTrigger />
        <FolderList />
      </div>
      <ResetScan />
    </div>
  );
}
