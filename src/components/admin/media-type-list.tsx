'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  deleteMediaType,
  updateMediaType,
} from '@/actions/admin/manage-media-types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MediaType } from '@/types/media-types';

// Adding a simple Skeleton component since we don't have access to the project's full UI library
function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

interface MediaTypeListProps {
  mediaTypes: MediaType[];
  isLoading: boolean;
  onUpdate: () => Promise<void>;
}

export default function MediaTypeList({
  mediaTypes,
  isLoading,
  onUpdate,
}: MediaTypeListProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Group media types by mime_type
  const groupedTypes = mediaTypes.reduce<Record<string, MediaType[]>>(
    (groups, type) => {
      if (!groups[type.mime_type]) {
        groups[type.mime_type] = [];
      }
      groups[type.mime_type].push(type);
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

      toast.success(
        `${type.mime_type} (${type.mime_type}) is now ${
          value ? 'ignored' : 'not ignored'
        }`,
      );

      await onUpdate();
    } catch (_err) {
      toast.error('Failed to update media type. Please try again.');
    }
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

      toast.success(
        `${type.mime_type} (${type.mime_type}) is now ${
          value ? 'natively supported' : 'not natively supported'
        }`,
      );

      await onUpdate();
    } catch (_err) {
      toast.error('Failed to update media type. Please try again.');
    }
  };

  // Handle deleting a media type
  const handleDeleteMediaType = async (type: MediaType) => {
    if (
      !window.confirm(
        `Are you sure you want to delete this media type: ${type.mime_type} (${type.mime_type})? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const result = await deleteMediaType(type.id);

      if (!result.success) {
        throw result.error;
      }

      toast.success(`${type.mime_type} (${type.mime_type}) has been deleted`);

      await onUpdate();
    } catch (_err) {
      toast.error(
        'Failed to delete media type. It may be in use by existing media.',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const allMediaTypes =
    activeTab === 'all' ? mediaTypes : groupedTypes[activeTab] || [];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Types</TabsTrigger>
          {categories.sort().map((mime_type) => (
            <TabsTrigger key={mime_type} value={mime_type}>
              {mime_type.charAt(0).toUpperCase() + mime_type.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMediaTypes.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No media types found</CardTitle>
                  <CardDescription>
                    {activeTab === 'all'
                      ? 'No media types have been created yet. They are automatically generated when scanning directories.'
                      : `No media types found in the ${activeTab} mime_type.`}
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              allMediaTypes.map((type) => (
                <Card key={type.id}>
                  <CardHeader>
                    <CardTitle>{type.mime_type}</CardTitle>
                    <CardDescription>
                      Category: {type.mime_type}{' '}
                      {type.is_ignored && '(Ignored)'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {type.type_description && (
                      <p className="text-sm text-muted-foreground">
                        {type.type_description}
                      </p>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`ignore-${type.id}`}
                          checked={type.is_ignored}
                          onCheckedChange={(value) =>
                            handleToggleIgnored(type, !!value)
                          }
                        />
                        <Label htmlFor={`ignore-${type.id}`}>
                          Ignore files of this type
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`native-${type.id}`}
                          checked={type.is_native}
                          onCheckedChange={(value) =>
                            handleToggleNative(type, !!value)
                          }
                        />
                        <Label htmlFor={`native-${type.id}`}>
                          Can be displayed natively
                        </Label>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMediaType(type)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
