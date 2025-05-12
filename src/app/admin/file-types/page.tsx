'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  getMediaTypes,
  refreshAllMediaTypes,
  refreshImageMediaTypes,
} from '@/actions/admin/manage-media-types';
import ActionButton from '@/components/admin/action-button';
import AdminLayout from '@/components/admin/layout';
import MediaTypeList from '@/components/admin/media-type-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { MediaType } from '@/types/media-types';

export default function AdminFileTypesPage() {
  const [mediaTypes, setMediaTypes] = useState<MediaType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [refreshProgress, setRefreshProgress] = useState({
    processed: 0,
    updated: 0,
    newTypes: 0,
    total: 0,
    status: '',
  });
  const [batchProgress, setbatchProgress] = useState({
    processed: 0,
    updated: 0,
    newTypes: 0,
    batchesCompleted: 0,
    totalBatches: 0,
    status: '',
  });

  // Fetch all media types on page load
  useEffect(() => {
    fetchMediaTypes();
  }, []);

  const fetchMediaTypes = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getMediaTypes();

      if (response.error) {
        throw response.error;
      }

      setMediaTypes(response.types);
    } catch (e) {
      setError('Failed to load media types');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshImageTypes = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (isRefreshing || isRefreshingAll)
      return {
        success: false,
        error: 'Refresh already in progress',
      };

    setIsRefreshing(true);
    setRefreshProgress({
      processed: 0,
      updated: 0,
      newTypes: 0,
      total: 0,
      status: 'Refreshing image media types...',
    });

    try {
      const result = await refreshImageMediaTypes();

      if (!result.success) {
        toast.error(`Failed to refresh image types: ${result.error}`);
        setRefreshProgress((prev) => ({
          ...prev,
          status: `Error: ${result.error}`,
        }));
        return {
          success: false,
          error: result.error,
        };
      }

      setRefreshProgress({
        processed: result.processed,
        updated: result.updated,
        newTypes: result.newTypes,
        total: result.processed,
        status: 'Refresh completed successfully',
      });

      toast.success(
        `Refreshed ${result.processed} image files, updated ${result.updated} types, found ${result.newTypes} new types`,
      );

      // Refresh the media types list to show any new types
      await fetchMediaTypes();
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error refreshing image types:', error);
      toast.error('An unexpected error occurred while refreshing image types');
      setRefreshProgress((prev) => ({
        ...prev,
        status: 'Error occurred during refresh',
      }));
      return {
        success: false,
        error: 'An unexpected error occurred while refreshing image types',
      };
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshAllMediaTypes = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (isRefreshingAll || isRefreshing)
      return { success: false, error: 'Refresh already in progress' };

    setIsRefreshingAll(true);
    setbatchProgress({
      processed: 0,
      updated: 0,
      newTypes: 0,
      batchesCompleted: 0,
      totalBatches: 0,
      status: 'Starting batch processing of all media types...',
    });

    try {
      const result = await refreshAllMediaTypes(batchSize);

      if (!result.success) {
        toast.error(`Failed to refresh media types: ${result.error}`);
        setbatchProgress((prev) => ({
          ...prev,
          status: `Error: ${result.error}`,
        }));
        return {
          success: false,
          error: result.error,
        };
      }

      setbatchProgress({
        processed: result.processed,
        updated: result.updated,
        newTypes: result.newTypes,
        batchesCompleted: result.batchesCompleted,
        totalBatches: result.totalBatches,
        status: 'Batch refresh completed successfully',
      });

      toast.success(
        `Processed ${result.processed} files in ${result.batchesCompleted} batches, ` +
          `updated ${result.updated} media types, found ${result.newTypes} new types`,
      );

      // Refresh the media types list to show any new types
      await fetchMediaTypes();
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error refreshing all media types:', error);
      toast.error(
        'An unexpected error occurred while batch processing media types',
      );
      setbatchProgress((prev) => ({
        ...prev,
        status: 'Error occurred during batch processing',
      }));
      return {
        success: false,
        error:
          'An unexpected error occurred while batch processing media types',
      };
    } finally {
      setIsRefreshingAll(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Media Types Management</h2>

          <div className="flex items-center gap-2">
            <ActionButton
              action={handleRefreshImageTypes}
              disabled={isRefreshingAll}
            >
              Refresh Image Types
            </ActionButton>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ActionButton
                    action={handleRefreshAllMediaTypes}
                    disabled={isRefreshing}
                    variant="outline"
                  >
                    Refresh All Types
                  </ActionButton>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Process all media files in batches and update their file
                    types
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Batch Size Controls */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">
              Media Type Refresh Controls
            </CardTitle>
            <CardDescription>
              Configure how media types are refreshed and updated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batchSize">Batch Size</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="batchSize"
                    type="number"
                    min="10"
                    max="200"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    disabled={isRefreshingAll}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRefreshAllMediaTypes}
                    disabled={isRefreshing || isRefreshingAll}
                  >
                    Process All Files
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Number of files to process in each batch (10-200)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Image Media Types Progress */}
        {isRefreshing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                Refreshing Image Media Types
              </CardTitle>
              <CardDescription>
                Re-scanning image files and updating media types...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress
                  value={
                    refreshProgress.total > 0
                      ? (refreshProgress.processed / refreshProgress.total) *
                        100
                      : 0
                  }
                />
                <div className="text-sm text-muted-foreground">
                  {refreshProgress.status}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full text-sm">
                <span>Processed: {refreshProgress.processed}</span>
                <span>Updated: {refreshProgress.updated}</span>
                <span>New types: {refreshProgress.newTypes}</span>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* All Media Types Batch Progress */}
        {isRefreshingAll && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                Batch Processing All Media Types
              </CardTitle>
              <CardDescription>
                Processing all files in batches of {batchSize}...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Progress
                  value={
                    batchProgress.totalBatches > 0
                      ? (batchProgress.batchesCompleted /
                          batchProgress.totalBatches) *
                        100
                      : 0
                  }
                />
                <div className="text-sm text-muted-foreground">
                  {batchProgress.status}
                </div>
                <div className="text-sm">
                  Batch {batchProgress.batchesCompleted} of{' '}
                  {batchProgress.totalBatches}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full text-sm">
                <span>Processed: {batchProgress.processed}</span>
                <span>Updated: {batchProgress.updated}</span>
                <span>New types: {batchProgress.newTypes}</span>
              </div>
            </CardFooter>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <MediaTypeList
          mediaTypes={mediaTypes || []}
          isLoading={isLoading}
          onUpdate={fetchMediaTypes}
        />
      </div>
    </AdminLayout>
  );
}
