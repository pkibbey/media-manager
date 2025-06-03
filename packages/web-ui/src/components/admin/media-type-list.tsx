'use client';

import { updateMediaType } from '@/actions/admin/manage-media-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  File,
  FileText,
  Image as ImageIcon,
  Music,
  Power,
  PowerOff,
  RefreshCw,
  Video,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { MediaType } from 'shared/types';

interface MediaTypeListProps {
  mediaTypes: MediaType[];
  onUpdate: () => Promise<void>;
}

// Add a function to get the icon for a category
function getCategoryIcon(category: string) {
  switch (category) {
    case 'audio':
      return <Music className="mr-2 text-blue-500" size={18} />;
    case 'video':
      return <Video className="mr-2 text-purple-500" size={18} />;
    case 'image':
      return <ImageIcon className="mr-2 text-green-500" size={18} />;
    case 'text':
      return <FileText className="mr-2 text-gray-500" size={18} />;
    case 'application':
      return <File className="mr-2 text-orange-500" size={18} />;
    default:
      return <File className="mr-2 text-muted-foreground" size={18} />;
  }
}

export function MediaTypeList({ mediaTypes, onUpdate }: MediaTypeListProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Group media types by mime_type
  const groupedTypes = mediaTypes.reduce<Record<string, MediaType[]>>(
    (groups, type) => {
      const category = type.mime_type.split('/')[0];
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(type);
      return groups;
    },
    { all: [] },
  );

  // Get unique categories for tabs
  const categories = Object.keys(groupedTypes).filter((key) => key !== 'all');

  // Handle toggle for is_ignored
  const handleToggleIgnored = async (type: MediaType, value: boolean) => {
    try {
      const result = await updateMediaType(type.id, {
        is_ignored: value,
      });

      if (!result.success) {
        throw result.error;
      }
      await onUpdate(); // Refresh UI after update
    } catch (_err) {}
  };

  // Handle toggle for is_native
  const handleToggleNative = async (type: MediaType, value: boolean) => {
    try {
      const result = await updateMediaType(type.id, {
        is_native: value,
      });

      if (!result.success) {
        throw result.error;
      }
      await onUpdate(); // Refresh UI after update
    } catch (_err) {}
  };

  const allMediaTypes =
    activeTab === 'all' ? mediaTypes : groupedTypes[activeTab] || [];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Types</TabsTrigger>
          {categories.sort().map((mime_type) => (
            <TabsTrigger
              key={mime_type}
              value={mime_type}
              className="capitalize"
            >
              {mime_type}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allMediaTypes.map((type) => {
              const category = type.mime_type.split('/')[0];
              const subType = type.mime_type.split('/')[1];
              return (
                <Card
                  key={type.id}
                  className={cn(type.is_ignored && 'opacity-30')}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      {getCategoryIcon(category)}
                      {subType}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 px-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={
                          type.is_ignored
                            ? 'Turn on processing for files of this type'
                            : 'Turn off processing for files of this type'
                        }
                        className="gap-2 cursor-pointer"
                        onClick={() =>
                          handleToggleIgnored(type, !type.is_ignored)
                        }
                        aria-label="Toggle processing"
                      >
                        {type.is_ignored ? (
                          <PowerOff size={16} strokeWidth={2} />
                        ) : (
                          <Power size={16} strokeWidth={2} />
                        )}
                        <Label className="text-xs cursor-pointer">
                          {type.is_ignored ? 'Off' : 'On'}
                        </Label>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        title={
                          type.is_native
                            ? 'Requires conversion before display'
                            : 'Can be displayed natively by browser'
                        }
                        className={cn(
                          'gap-2 cursor-pointer',
                          type.is_native
                            ? 'text-green-600'
                            : 'text-muted-foreground',
                        )}
                        onClick={() =>
                          handleToggleNative(type, !type.is_native)
                        }
                        aria-label="Toggle native display"
                      >
                        {type.is_native ? (
                          <Zap size={16} strokeWidth={2} />
                        ) : (
                          <RefreshCw size={16} strokeWidth={2} />
                        )}
                        <Label className="text-xs cursor-pointer">
                          {type.is_native ? 'Direct' : 'Convert'}
                        </Label>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
