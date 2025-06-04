'use client';

import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Bot,
  Calendar,
  Copy,
  Eye,
  FileText,
  Image,
  Search,
  Zap,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

const navItemGroups = [
  {
    category: 'Media',
    items: [
      { href: '/admin/scan', label: 'Scan', icon: Search },
      { href: '/admin/file-types', label: 'File Types', icon: Image },
    ],
  },
  {
    category: 'Processing',
    items: [
      { href: '/admin/exif', label: 'EXIF Data', icon: FileText },
      { href: '/admin/thumbnails', label: 'Thumbnails', icon: Zap },
    ],
  },
  {
    category: 'Clean',

    items: [
      { href: '/admin/duplicates', label: 'Duplicates', icon: Copy },
      { href: '/admin/fix-dates', label: 'Fix Image Dates', icon: Calendar },
    ],
  },
  {
    category: 'Analysis',
    items: [
      { href: '/admin/objects', label: 'Object Detection', icon: Eye },
      { href: '/admin/advanced', label: 'Advanced Analysis', icon: Bot },
      { href: '/admin/warnings', label: 'Warnings', icon: AlertTriangle },
    ],
  },
  {
    category: 'Views',
    items: [{ href: '/', label: 'Browse', icon: Search }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {navItemGroups.map((group) => (
        <div key={group.category}>
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {group.category}
          </h3>
          <div className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <a
                    href={item.href}
                    className={
                      isActive
                        ? 'flex items-center gap-2 bg-slate-100 dark:bg-slate-800 font-medium'
                        : 'flex items-center gap-2'
                    }
                  >
                    <IconComponent className="h-4 w-4" />
                    {item.label}
                  </a>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
