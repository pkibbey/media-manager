'use client';

import {
  Copy,
  Eye,
  Hash,
  Image as ImageIcon,
  Trash2,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { deleteSelectedDuplicates } from '@/actions/analysis/delete-duplicates';
import {
  type DuplicateGroup,
  type DuplicatesResult,
  getDuplicates,
} from '@/actions/analysis/get-duplicates';
import AdminLayout from '@/components/admin/layout';
import { StatsCard } from '@/components/admin/stats-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DuplicateItemProps {
  item: DuplicateGroup['items'][0];
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

function DuplicateItem({ item, isSelected, onSelect }: DuplicateItemProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const getFileName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <Card
      className={`transition-all cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : 'hover:shadow-md'
      }`}
      onClick={() => onSelect?.(item.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {item.thumbnail_data?.thumbnail_url ? (
              <Image
                src={item.thumbnail_data.thumbnail_url}
                alt="Thumbnail"
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded border"
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium truncate">
                {getFileName(item.media_path)}
              </h4>
              {isSelected && (
                <Badge variant="default" className="ml-2">
                  Selected
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(item.size_bytes)}
            </p>

            {item.visual_hash && (
              <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                {item.visual_hash.substring(0, 16)}...
              </p>
            )}

            <div className="flex items-center space-x-2 mt-2">
              {item.exif_data && (
                <Badge variant="outline" className="text-xs">
                  {item.exif_data.width}×{item.exif_data.height}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {item.media_types?.mime_type || 'Unknown'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 pt-2 border-t">
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Eye className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DuplicateGroupProps {
  group: DuplicateGroup;
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
}

function DuplicateGroupComponent({
  group,
  selectedItems,
  onItemSelect,
}: DuplicateGroupProps) {
  const getSimilarityColor = (similarity: DuplicateGroup['similarity']) => {
    switch (similarity) {
      case 'exact':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSimilarityLabel = (
    similarity: DuplicateGroup['similarity'],
    distance?: number,
  ) => {
    switch (similarity) {
      case 'exact':
        return 'Exact Match';
      case 'high':
        return `High Similarity (${distance} bits diff)`;
      case 'medium':
        return `Medium Similarity (${distance} bits diff)`;
      default:
        return 'Similar';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Hash className="h-5 w-5" />
            <span>Duplicate Group ({group.items.length} items)</span>
          </CardTitle>
          <Badge variant={getSimilarityColor(group.similarity)}>
            {getSimilarityLabel(group.similarity, group.hammingDistance)}
          </Badge>
        </div>
        <CardDescription>
          Visual hash:{' '}
          <code className="text-xs font-mono">
            {group.hash.substring(0, 32)}...
          </code>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {group.items.map((item) => (
            <DuplicateItem
              key={item.id}
              item={item}
              isSelected={selectedItems.has(item.id)}
              onSelect={onItemSelect}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DuplicatesAdminPage() {
  const [duplicatesData, setDuplicatesData] = useState<DuplicatesResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxDistance, setMaxDistance] = useState([10]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const loadDuplicates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getDuplicates(maxDistance[0]);
      setDuplicatesData(result);

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load duplicates',
      );
    } finally {
      setIsLoading(false);
    }
  }, [maxDistance]);

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  const handleItemSelect = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = () => {
    if (!duplicatesData) return;

    const allIds = new Set<string>();
    duplicatesData.groups.forEach((group) => {
      group.items.forEach((item) => allIds.add(item.id));
    });
    setSelectedItems(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.size} selected items? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      const result = await deleteSelectedDuplicates(Array.from(selectedItems));

      if (result.success) {
        toast.success(`Successfully deleted ${result.deletedCount} items`);
        setSelectedItems(new Set());
        // Reload duplicates after deletion
        await loadDuplicates();
      } else {
        toast.error(result.error || 'Failed to delete items');
      }
    } catch (error) {
      toast.error('An unexpected error occurred while deleting items');
      console.error('Delete error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeepBest = () => {
    if (!duplicatesData) return;

    const newSelection = new Set<string>();

    duplicatesData.groups.forEach((group) => {
      if (group.items.length <= 1) return;

      // Sort by file size (largest first), then by dimensions if available
      const sortedItems = [...group.items].sort((a, b) => {
        // First, prefer items with dimensions (EXIF data)
        const aHasDimensions = a.exif_data?.width && a.exif_data?.height;
        const bHasDimensions = b.exif_data?.width && b.exif_data?.height;

        if (aHasDimensions && !bHasDimensions) return -1;
        if (!aHasDimensions && bHasDimensions) return 1;

        // If both have dimensions, prefer larger images
        if (aHasDimensions && bHasDimensions) {
          const aPixels =
            (a.exif_data!.width || 0) * (a.exif_data!.height || 0);
          const bPixels =
            (b.exif_data!.width || 0) * (b.exif_data!.height || 0);
          if (aPixels !== bPixels) return bPixels - aPixels;
        }

        // Fall back to file size
        return b.size_bytes - a.size_bytes;
      });

      // Select all items except the best one for deletion
      sortedItems.slice(1).forEach((item) => {
        newSelection.add(item.id);
      });
    });

    setSelectedItems(newSelection);
    toast.success(
      `Selected ${newSelection.size} items for deletion (keeping the best quality from each group)`,
    );
  };

  const exactGroups =
    duplicatesData?.groups.filter((g) => g.similarity === 'exact') || [];
  const similarGroups =
    duplicatesData?.groups.filter((g) => g.similarity !== 'exact') || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Duplicate Detection</h2>
          <p className="text-muted-foreground">
            Find and manage potentially duplicate images using visual hash
            comparison
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Groups"
            total={duplicatesData?.stats.totalGroups || 0}
            processed={duplicatesData?.stats.totalGroups || 0}
            isLoading={isLoading}
            icon={<Users className="h-4 w-4" />}
          />
          <StatsCard
            title="Duplicate Items"
            total={duplicatesData?.stats.totalDuplicateItems || 0}
            processed={duplicatesData?.stats.totalDuplicateItems || 0}
            isLoading={isLoading}
            icon={<Copy className="h-4 w-4" />}
          />
          <StatsCard
            title="Exact Matches"
            total={duplicatesData?.stats.exactMatches || 0}
            processed={duplicatesData?.stats.exactMatches || 0}
            isLoading={isLoading}
            icon={<Hash className="h-4 w-4" />}
          />
          <StatsCard
            title="Similar Items"
            total={duplicatesData?.stats.similarMatches || 0}
            processed={duplicatesData?.stats.similarMatches || 0}
            isLoading={isLoading}
            icon={<ImageIcon className="h-4 w-4" />}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Detection Settings</CardTitle>
            <CardDescription>
              Adjust the sensitivity for finding similar images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Maximum Hamming Distance: {maxDistance[0]}</Label>
              <Slider
                value={maxDistance}
                onValueChange={setMaxDistance}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values find more similar images. Higher values may include
                false positives.
              </p>
            </div>

            <div className="flex space-x-2">
              <Button onClick={loadDuplicates} disabled={isLoading}>
                {isLoading ? 'Scanning...' : 'Scan for Duplicates'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSelectAll}
                disabled={!duplicatesData?.groups.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                onClick={handleDeselectAll}
                disabled={selectedItems.size === 0}
              >
                Deselect All
              </Button>
              <Button
                variant="secondary"
                onClick={handleKeepBest}
                disabled={!duplicatesData?.groups.length || isLoading}
              >
                Keep Best Quality
              </Button>
              <Button
                variant="destructive"
                disabled={selectedItems.size === 0 || isLoading}
                onClick={handleDeleteSelected}
                className="ml-auto"
              >
                Delete Selected ({selectedItems.size})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Progress value={33} className="flex-1" />
                <span className="text-sm text-muted-foreground">
                  Scanning for duplicates...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {duplicatesData && !isLoading && (
          <Tabs defaultValue="exact" className="space-y-4">
            <TabsList>
              <TabsTrigger value="exact">
                Exact Matches ({exactGroups.length})
              </TabsTrigger>
              <TabsTrigger value="similar">
                Similar Images ({similarGroups.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Groups ({duplicatesData.groups.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="exact" className="space-y-4">
              {exactGroups.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      No exact duplicate matches found.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4 pr-4">
                    {exactGroups.map((group, index) => (
                      <DuplicateGroupComponent
                        key={`exact-${index}`}
                        group={group}
                        selectedItems={selectedItems}
                        onItemSelect={handleItemSelect}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="similar" className="space-y-4">
              {similarGroups.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      No similar images found with current settings.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4 pr-4">
                    {similarGroups.map((group, index) => (
                      <DuplicateGroupComponent
                        key={`similar-${index}`}
                        group={group}
                        selectedItems={selectedItems}
                        onItemSelect={handleItemSelect}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {duplicatesData.groups.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      No duplicate groups found.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4 pr-4">
                    {duplicatesData.groups.map((group, index) => (
                      <DuplicateGroupComponent
                        key={`all-${index}`}
                        group={group}
                        selectedItems={selectedItems}
                        onItemSelect={handleItemSelect}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminLayout>
  );
}
