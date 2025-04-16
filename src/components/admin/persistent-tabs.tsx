'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

interface PersistentTabsProps {
  defaultValue: string;
  tabOptions: {
    value: string;
    label: string;
    content: ReactNode;
  }[];
  className?: string;
}

export default function PersistentTabs({
  defaultValue,
  tabOptions,
  className,
}: PersistentTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(defaultValue);

  // On initial render, check if tab is in URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabOptions.some((tab) => tab.value === tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab(defaultValue);
    }
  }, [defaultValue, searchParams, tabOptions]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Update URL with the new tab value
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);

    // Replace the URL to avoid creating a new history entry for each tab change
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={className}
    >
      <TabsList>
        {tabOptions.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabOptions.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
