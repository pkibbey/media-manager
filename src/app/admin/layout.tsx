import PersistentTabs from '@/components/admin/persistent-tabs';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navItems = [
    { href: '/admin/folders', label: 'Folders' },
    { href: '/admin/scan', label: 'Scan' },
    { href: '/admin/processing', label: 'Processing' },
    { href: '/admin/thumbnails', label: 'Thumbnails' },
    { href: '/admin/timestamps', label: 'Timestamps' },
    { href: '/admin/file-types', label: 'File-types' },
    { href: '/admin/stats', label: 'Stats' },
  ];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <PersistentTabs navItems={navItems} />
      <div className="pt-6">{children}</div>
    </div>
  );
}
