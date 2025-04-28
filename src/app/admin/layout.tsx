import type { ReactNode } from 'react';
import PersistentTabs from '@/components/admin/persistent-tabs';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navItems = [
    { href: '/admin/folders', label: 'Folders' },
    { href: '/admin/scan', label: 'Scan' },
    { href: '/admin/file-types', label: 'File Types' },
    { href: '/admin/exif', label: 'Exif' },
    { href: '/admin/thumbnails', label: 'Thumbnails' },
    { href: '/admin/stats', label: 'Stats' },
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
      <PersistentTabs
        navItems={navItems}
        className="sticky top-0 py-2 bg-background z-10"
      />
      <div className="pt-4">{children}</div>
    </div>
  );
}
