'use client';

import {
  type ThumbnailProcessingCounts,
  getThumbnailProcessingCounts,
} from '@/actions/thumbnails/get-thumbnail-processing-counts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle,
  Database,
  ImageIcon,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThumbnailProcessingCountsDisplay() {
  const [counts, setCounts] = useState<ThumbnailProcessingCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getThumbnailProcessingCounts();
        console.log('data: ', data);
        setCounts(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch thumbnail counts',
        );
        console.error('Error fetching thumbnail processing counts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();

    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Thumbnail Processing Statistics
          </CardTitle>
          <CardDescription>
            Loading processing counts and mismatch detection...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !counts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Thumbnail Processing Statistics
          </CardTitle>
          <CardDescription>
            Failed to load processing statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <span>{error || 'Unknown error occurred'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { database, queue, mismatches, summary } = counts;
  const thumbnailCoverage =
    database.totalMedia > 0
      ? (database.withThumbnails / database.totalMedia) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Main Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Thumbnail Processing Statistics
          </CardTitle>
          <CardDescription>
            Overview of thumbnail generation progress and data consistency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Database Statistics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <h4 className="font-semibold">Database State</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Media</p>
                <p className="text-2xl font-bold">
                  {database.totalMedia.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">With Thumbnails</p>
                <p className="text-2xl font-bold text-green-600">
                  {database.withThumbnails.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Without Thumbnails
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {database.withoutThumbnails.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Image Files</p>
                <p className="text-2xl font-bold">
                  {database.imageMediaOnly.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Thumbnail Coverage Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Thumbnail Coverage</p>
                <span className="text-sm text-muted-foreground">
                  {thumbnailCoverage.toFixed(1)}%
                </span>
              </div>
              <Progress value={thumbnailCoverage} className="h-2" />
            </div>
          </div>

          {/* Queue Statistics */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <h4 className="font-semibold">Queue Processing</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-green-600">
                  {queue.completed.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-xl font-bold text-red-600">
                  {queue.failed.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-blue-600">
                  {queue.active.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Waiting</p>
                <p className="text-xl font-bold text-orange-600">
                  {queue.waiting.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Processed</p>
                <p className="text-xl font-bold">
                  {queue.totalProcessed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mismatch Detection Card */}
      <Card
        className={
          mismatches.totalMismatches > 0
            ? 'border-orange-200 bg-orange-50/50'
            : 'border-green-200 bg-green-50/50'
        }
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              className={`h-5 w-5 ${mismatches.totalMismatches > 0 ? 'text-orange-600' : 'text-green-600'}`}
            />
            Data Consistency Check
          </CardTitle>
          <CardDescription>
            Detection of mismatches between queue status and database state
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Completed Jobs Missing Thumbnails
              </p>
              <p
                className={`text-2xl font-bold ${mismatches.completedButNoThumbnail > 0 ? 'text-orange-600' : 'text-green-600'}`}
              >
                {mismatches.completedButNoThumbnail.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Jobs marked completed but no thumbnail_url in database
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Failed Jobs with Thumbnails
              </p>
              <p
                className={`text-2xl font-bold ${mismatches.failedButHasThumbnail > 0 ? 'text-orange-600' : 'text-green-600'}`}
              >
                {mismatches.failedButHasThumbnail.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Jobs marked failed but have thumbnail_url in database
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Mismatches</p>
              <p
                className={`text-2xl font-bold ${mismatches.totalMismatches > 0 ? 'text-orange-600' : 'text-green-600'}`}
              >
                {mismatches.totalMismatches.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Combined inconsistencies detected
              </p>
            </div>
          </div>

          {/* Match Quality Summary */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Queue-Database Consistency</p>
              <span
                className={`text-sm font-semibold ${summary.matchPercentage >= 95 ? 'text-green-600' : summary.matchPercentage >= 80 ? 'text-orange-600' : 'text-red-600'}`}
              >
                {summary.matchPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={summary.matchPercentage}
              className={`h-2 ${summary.matchPercentage >= 95 ? '' : 'border-orange-200'}`}
            />
            <p className="text-xs text-muted-foreground">
              {summary.actualMatches.toLocaleString()} of{' '}
              {summary.expectedMatches.toLocaleString()} processed jobs match
              expected database state
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
