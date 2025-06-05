'use client';

import {
  type DuplicatePair,
  getDuplicatePairs,
} from '@/actions/duplicates/get-duplicate-pairs';
import {
  dismissDuplicate,
  markMediaAsDeleted,
} from '@/actions/duplicates/manage-duplicates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaLightbox } from '@/contexts/media-lightbox-context';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  FileImage,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Helper functions for duplicate analysis
function isLikelyRenamedFile(filename: string): boolean {
  const lowerFilename = filename.toLowerCase();

  // Check for pattern like f[numbers].[extension]
  const renamedPattern =
    /^f\d+\.(sr2|nef|arw|cr2|dng|raf|rw2|orf|pef|3fr|fff|iiq|rwl|srw|x3f|jpg|jpeg|png|tiff?|bmp|gif|webp)$/i;

  return renamedPattern.test(lowerFilename);
}

function calculateResolution(
  width?: number | null,
  height?: number | null,
): number {
  if (!width || !height) return 0;
  return width * height;
}

function formatResolution(
  width?: number | null,
  height?: number | null,
): string {
  if (!width || !height) return 'Unknown';
  const megapixels = (width * height) / 1000000;
  return `${width} × ${height} (${megapixels.toFixed(1)}MP)`;
}

function formatTimestamp(timestamp?: string | null): string {
  if (!timestamp) return 'Unknown';
  return `${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString()}`;
}

function analyzeOriginalCandidate(
  media: DuplicatePair['media'],
  duplicate: DuplicatePair['duplicate_media'],
): {
  likelyOriginal: 'media' | 'duplicate' | 'unclear';
  reasons: string[];
} {
  const reasons: string[] = [];
  let mediaScore = 0;
  let duplicateScore = 0;

  // Check filename patterns
  const mediaRenamed = isLikelyRenamedFile(
    media.media_path.split('/').pop() || '',
  );
  const duplicateRenamed = isLikelyRenamedFile(
    duplicate.media_path.split('/').pop() || '',
  );

  if (mediaRenamed && !duplicateRenamed) {
    duplicateScore += 2;
    reasons.push('Second image has more descriptive filename');
  } else if (!mediaRenamed && duplicateRenamed) {
    mediaScore += 2;
    reasons.push('First image has more descriptive filename');
  }

  // Check resolution
  const mediaRes = calculateResolution(
    media.exif_data?.width,
    media.exif_data?.height,
  );
  const duplicateRes = calculateResolution(
    duplicate.exif_data?.width,
    duplicate.exif_data?.height,
  );

  if (mediaRes > duplicateRes && duplicateRes > 0) {
    mediaScore += 1;
    reasons.push('First image has higher resolution');
  } else if (duplicateRes > mediaRes && mediaRes > 0) {
    duplicateScore += 1;
    reasons.push('Second image has higher resolution');
  }

  // Check file size (larger might be better quality, but not always)
  if (media.size_bytes > duplicate.size_bytes) {
    mediaScore += 0.5;
  } else if (duplicate.size_bytes > media.size_bytes) {
    duplicateScore += 0.5;
  }

  // Check timestamps (earlier might be more original)
  if (media.exif_data?.exif_timestamp && duplicate.exif_data?.exif_timestamp) {
    const mediaTime = new Date(media.exif_data.exif_timestamp).getTime();
    const duplicateTime = new Date(
      duplicate.exif_data.exif_timestamp,
    ).getTime();

    if (mediaTime < duplicateTime) {
      mediaScore += 1;
      reasons.push('First image was taken earlier');
    } else if (duplicateTime < mediaTime) {
      duplicateScore += 1;
      reasons.push('Second image was taken earlier');
    }
  }

  if (Math.abs(mediaScore - duplicateScore) < 1) {
    return { likelyOriginal: 'unclear', reasons };
  }

  return {
    likelyOriginal: mediaScore > duplicateScore ? 'media' : 'duplicate',
    reasons,
  };
}

interface DuplicateCardProps {
  pair: DuplicatePair;
  onUpdate: () => void;
}

function DuplicateCard({ pair, onUpdate }: DuplicateCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { openLightbox } = useMediaLightbox();

  const analysis = analyzeOriginalCandidate(pair.media, pair.duplicate_media);

  const handleImageClick = async (mediaId: string) => {
    await openLightbox(mediaId);
  };

  const handleMarkAsDeleted = async (mediaId: string) => {
    setIsProcessing(true);
    try {
      const result = await markMediaAsDeleted(mediaId);
      if (result.success) {
        onUpdate();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = async () => {
    setIsProcessing(true);
    try {
      const result = await dismissDuplicate(pair.media_id, pair.duplicate_id);
      if (result.success) {
        onUpdate();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileName = (path: string) => path.split('/').pop() || 'Unknown file';

  const getConfidenceText = (score: number) => {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.8) return 'High';
    if (score >= 0.7) return 'Medium';
    if (score >= 0.6) return 'Low';
    return 'Very Low';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-red-500';
    if (score >= 0.8) return 'bg-orange-500';
    if (score >= 0.7) return 'bg-yellow-500';
    if (score >= 0.6) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Duplicate Images Detected</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-white ${getConfidenceColor(pair.similarity_score)}`}
            >
              {getConfidenceText(pair.similarity_score)} (
              {(pair.similarity_score * 100).toFixed(1)}%)
            </Badge>
            <Badge variant="outline">
              Hamming Distance: {pair.hamming_distance}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Choose which image to keep or dismiss this duplicate relationship
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Analysis Summary */}
        {analysis.reasons.length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Star className="h-4 w-4" />
              Analysis
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {analysis.reasons.map((reason, index) => (
                <li key={index}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Image */}
          <div className="space-y-3">
            <div className="relative group">
              {analysis.likelyOriginal === 'media' && (
                <Badge className="absolute top-2 left-2 z-10 bg-green-500 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Likely Original
                </Badge>
              )}
              {pair.media.thumbnail_url ? (
                <img
                  src={pair.media.thumbnail_url}
                  alt={getFileName(pair.media.media_path)}
                  className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleImageClick(pair.media.id)}
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 rounded-lg border flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-gray-400" />
                  <span className="text-gray-500 ml-2">No thumbnail</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p
                className="font-medium text-sm truncate"
                title={pair.media.media_path}
              >
                {getFileName(pair.media.media_path)}
                {isLikelyRenamedFile(getFileName(pair.media.media_path)) && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Renamed
                  </Badge>
                )}
              </p>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileImage className="h-3 w-3" />
                  Size: {formatFileSize(pair.media.size_bytes)}
                </div>

                {pair.media.exif_data?.width &&
                  pair.media.exif_data?.height && (
                    <div className="flex items-center gap-1">
                      <FileImage className="h-3 w-3" />
                      {formatResolution(
                        pair.media.exif_data.width,
                        pair.media.exif_data.height,
                      )}
                    </div>
                  )}

                {pair.media.exif_data?.exif_timestamp && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(pair.media.exif_data.exif_timestamp)}
                  </div>
                )}

                {/* Processing Method Information */}
                {pair.media.exif_process && (
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    EXIF: {pair.media.exif_process}
                  </div>
                )}

                {pair.media.thumbnail_process && (
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    THUMBNAIL: {pair.media.thumbnail_process}
                  </div>
                )}

                {pair.media.exif_data?.fix_date_process && (
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    DATE: {pair.media.exif_data.fix_date_process}
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleMarkAsDeleted(pair.media.id)}
                disabled={isProcessing}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete This Image
              </Button>
            </div>
          </div>

          {/* Second Image */}
          <div className="space-y-3">
            <div className="relative group">
              {analysis.likelyOriginal === 'duplicate' && (
                <Badge className="absolute top-2 left-2 z-10 bg-green-500 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Likely Original
                </Badge>
              )}
              {pair.duplicate_media.thumbnail_url ? (
                <img
                  src={pair.duplicate_media.thumbnail_url}
                  alt={getFileName(pair.duplicate_media.media_path)}
                  className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleImageClick(pair.duplicate_media.id)}
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 rounded-lg border flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-gray-400" />
                  <span className="text-gray-500 ml-2">No thumbnail</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p
                className="font-medium text-sm truncate"
                title={pair.duplicate_media.media_path}
              >
                {getFileName(pair.duplicate_media.media_path)}
                {isLikelyRenamedFile(
                  getFileName(pair.duplicate_media.media_path),
                ) && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Renamed
                  </Badge>
                )}
              </p>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileImage className="h-3 w-3" />
                  Size: {formatFileSize(pair.duplicate_media.size_bytes)}
                </div>

                {pair.duplicate_media.exif_data?.width &&
                  pair.duplicate_media.exif_data?.height && (
                    <div className="flex items-center gap-1">
                      <FileImage className="h-3 w-3" />
                      {formatResolution(
                        pair.duplicate_media.exif_data.width,
                        pair.duplicate_media.exif_data.height,
                      )}
                    </div>
                  )}

                {pair.duplicate_media.exif_data?.exif_timestamp && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(
                      pair.duplicate_media.exif_data.exif_timestamp,
                    )}
                  </div>
                )}

                {/* Processing Method Information */}
                {pair.duplicate_media.exif_process && (
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    EXIF: {pair.duplicate_media.exif_process}
                  </div>
                )}

                {pair.duplicate_media.thumbnail_process && (
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    THUMBNAIL: {pair.duplicate_media.thumbnail_process}
                  </div>
                )}

                {pair.duplicate_media.exif_data?.fix_date_process && (
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    DATE: {pair.duplicate_media.exif_data.fix_date_process}
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleMarkAsDeleted(pair.duplicate_media.id)}
                disabled={isProcessing}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete This Image
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button
            onClick={handleDismiss}
            disabled={isProcessing}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            Not Duplicates (Dismiss)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DuplicateCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <Skeleton className="h-4 w-96" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Skeleton className="w-full h-48 rounded-lg" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="w-full h-48 rounded-lg" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Skeleton className="h-8 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DuplicatesViewer() {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const pageSize = 10;

  const fetchDuplicates = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getDuplicatePairs(pageNum, pageSize);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (append) {
        setDuplicates((prev) => [...prev, ...result.duplicates]);
      } else {
        setDuplicates(result.duplicates);
      }

      setTotal(result.total);
      setHasMore(result.duplicates.length === pageSize);
    } catch {
      setError('Failed to fetch duplicates');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchDuplicates(nextPage, true);
  };

  const handleUpdate = () => {
    // Refresh the current view
    fetchDuplicates(1, false);
    setPage(1);
  };

  useEffect(() => {
    fetchDuplicates(1, false);
  }, [fetchDuplicates]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && duplicates.length === 0) {
    return (
      <div className="space-y-6">
        <DuplicateCardSkeleton />
        <DuplicateCardSkeleton />
        <DuplicateCardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Error loading duplicates</p>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchDuplicates(1, false)} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (duplicates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">No duplicates found</p>
            <p className="text-muted-foreground">
              All your images appear to be unique, or duplicate detection hasn't
              been run yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Detected Duplicates</h3>
          <p className="text-muted-foreground">
            Found {total} duplicate {total === 1 ? 'pair' : 'pairs'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {duplicates.map((pair) => (
          <DuplicateCard key={pair.id} pair={pair} onUpdate={handleUpdate} />
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button onClick={loadMore} disabled={loading} variant="outline">
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
