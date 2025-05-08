'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PersistentTabsProps {
  navItems: {
    href: string;
    label: string;
  }[];
  className?: string;
}

export default function PersistentTabs({
  navItems,
  className,
}: PersistentTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string | null>(navItems[0].href);

  // On initial render, check if tab is in URL
  useEffect(() => {
    if (pathname && navItems.some((tab) => tab.href === pathname)) {
      setActiveTab(pathname);
    } else {
      setActiveTab(navItems[0].href);
    }
  }, [pathname, navItems]);

  const handleTabChange = (href: string) => {
    setActiveTab(href);

    // Replace the URL to avoid creating a new history entry for each tab change
    router.push(href, { scroll: false });
  };

  return (
    <Tabs
      value={String(activeTab)}
      onValueChange={handleTabChange}
      className={className}
    >
      <TabsList className="space-x-1 px-1">
        {navItems.map((tab) => (
          <TabsTrigger key={tab.href} value={tab.href}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
