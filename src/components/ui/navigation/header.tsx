'use client';

import { cn } from '@/lib/utils';
import {
  BoxIcon,
  GearIcon,
  GridIcon,
  HomeIcon,
  ImageIcon,
} from '@radix-ui/react-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NavItem = ({ href, label, icon, ...props }: NavItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
        isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
      )}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export function Header() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          <span className="font-bold">Media Manager</span>
        </div>

        <nav className="flex items-center gap-1">
          <NavItem
            href="/"
            label="Home"
            icon={<HomeIcon className="h-4 w-4" />}
          />
          <NavItem
            href="/folders"
            label="Folders"
            icon={<BoxIcon className="h-4 w-4" />}
          />
          <NavItem
            href="/browse"
            label="Browse"
            icon={<GridIcon className="h-4 w-4" />}
          />
          <NavItem
            href="/admin"
            label="Admin"
            icon={<GearIcon className="h-4 w-4" />}
          />
        </nav>
      </div>
    </header>
  );
}
