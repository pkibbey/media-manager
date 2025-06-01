'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Overview', href: '/admin' },
  { name: 'Media Scan', href: '/admin/scan' },
  { name: 'File Types', href: '/admin/file-types' },
  { name: 'EXIF Processing', href: '/admin/exif' },
  { name: 'Thumbnails', href: '/admin/thumbnails' },
  { name: 'Object Analysis', href: '/admin/analysis' },
  { name: 'Advanced Analysis', href: '/admin/advanced' },
  { name: 'Duplicates', href: '/admin/duplicates' },
  { name: 'Content Warnings', href: '/admin/content-warnings' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card className="p-4">
          <h2 className="font-semibold text-lg mb-4">Navigation</h2>
          <Separator className="mb-4" />

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    isActive ? 'bg-slate-100 dark:bg-slate-800 font-medium' : ''
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </Card>

        {/* Main Content Area */}
        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}
