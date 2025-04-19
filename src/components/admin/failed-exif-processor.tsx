'use client';

import { getFailedExifFiles, retryFailedExifFiles } from '@/app/actions/exif';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LARGE_FILE_THRESHOLD } from '@/lib/consts';
import { bytesToSize } from '@/lib/utils';
import type { ExtractionMethod } from '@/types/exif';
import type { ErrorCategory, FailedFile } from '@/types/media-types';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProcessingTimeEstimator } from './processing-time-estimator';

export default function FailedExifProcessor() {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [failedFiles, setFailedFiles] = useState<FailedFile[]>([]);
  const [errorCategories, setErrorCategories] = useState<ErrorCategory[]>([]);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);
  const [extractionMethod, setExtractionMethod] =
    useState<ExtractionMethod>('default');
  const [skipLargeFiles, setSkipLargeFiles] = useState(true);
  const [startTime, setStartTime] = useState<number | undefined>();
  const [successCount, setSuccessCount] = useState(0);
  const [skippedLargeFiles, setSkippedLargeFiles] = useState(0);

  useEffect(() => {
    loadFailedFiles();
  }, []);

  // Handle select all checkbox
  useEffect(() => {
    if (failedFiles.length === 0) return;

    const newSelected: Record<string, boolean> = {};
    failedFiles.forEach((file) => {
      newSelected[file.id] = selectAll;
    });
    setSelected(newSelected);
  }, [selectAll, failedFiles]);

  // Calculate selected count
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const loadFailedFiles = async () => {
    setIsLoading(true);
    try {
      const res = await getFailedExifFiles();
      if (res.success && res.files) {
        setFailedFiles(res.files);

        // Group files by error type or file size
        const errorGroups: Record<string, FailedFile[]> = {};
        res.files.forEach((file: FailedFile) => {
          // Categorize files
          let errorType = 'Missing EXIF';

          if (file.error) {
            if (file.error.includes('large file')) {
              errorType = 'Large File';
            } else {
              errorType = categorizeError(file.error);
            }
          }

          if (!errorGroups[errorType]) {
            errorGroups[errorType] = [];
          }
          errorGroups[errorType].push(file);
        });

        // Convert to array and sort by count
        const categories = Object.entries(errorGroups).map(([type, files]) => ({
          type,
          count: files.length,
          examples: files.slice(0, 3), // Keep up to 3 examples per category
        }));

        categories.sort((a, b) => b.count - a.count);
        setErrorCategories(categories);
      } else {
        toast.error('Failed to load failed EXIF files');
      }
    } catch (error) {
      console.error('Error loading failed EXIF files:', error);
      toast.error('Error loading failed EXIF files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (selectedCount === 0) {
      toast.error('No files selected to retry');
      return;
    }

    const selectedIds = Object.entries(selected)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);

    setIsProcessing(true);
    setProgress(0);
    setProcessed(0);
    setSuccessCount(0);
    setSkippedLargeFiles(0);
    setStartTime(Date.now());

    try {
      const result = await retryFailedExifFiles(
        selectedIds,
        {
          method: extractionMethod,
          skipLargeFiles,
        },
        (processedCount: number) => {
          // This callback will be called with progress updates
          const progressPercent = Math.round(
            (processedCount / selectedCount) * 100,
          );
          setProgress(progressPercent);
          setProcessed(processedCount);
        },
      );

      if (result.success) {
        setSuccessCount(result.successCount || 0);
        setSkippedLargeFiles(result.skippedLargeFiles || 0);

        toast.success(
          `Successfully processed ${result.successCount} files (${result.skippedLargeFiles} large files skipped)`,
        );

        // Reload the list to show updated status
        await loadFailedFiles();
      } else {
        toast.error(
          `Failed to process EXIF data: ${result.error || result.message || 'Unknown error'}`,
        );
      }
    } catch (error) {
      console.error('Error retrying EXIF extraction:', error);
      toast.error('Error occurred while processing EXIF data');
    } finally {
      setIsProcessing(false);
      setStartTime(undefined);
    }
  };

  const toggleFileSelection = (id: string) => {
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Function to categorize error messages into standardized types
  const categorizeError = (errorMessage: string | null): string => {
    if (!errorMessage) return 'Missing EXIF';

    const lowerCase = errorMessage.toLowerCase();

    if (lowerCase.includes('not found') || lowerCase.includes('no such file'))
      return 'File Not Found';
    if (lowerCase.includes('permission denied')) return 'Permission Denied';
    if (lowerCase.includes('corrupt') || lowerCase.includes('invalid'))
      return 'Corrupt/Invalid File';
    if (lowerCase.includes('timeout')) return 'Processing Timeout';
    if (lowerCase.includes('unsupported')) return 'Unsupported Format';
    if (lowerCase.includes('large file')) return 'Large File';
    if (lowerCase.includes('exif')) return 'EXIF Parsing Error';

    return 'Other Error';
  };

  // Count large files in selection
  const largeFileCount = failedFiles.filter(
    (file) =>
      selected[file.id] &&
      file?.size_bytes &&
      file.size_bytes > LARGE_FILE_THRESHOLD,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Failed EXIF Processor</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={loadFailedFiles}
          disabled={isLoading || isProcessing}
        >
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        This tool allows you to retry EXIF data extraction for media files that
        failed to extract EXIF data.
      </p>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">
            Loading failed EXIF files...
          </p>
        </div>
      ) : failedFiles.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">No failed EXIF files found</p>
        </div>
      ) : (
        <>
          {/* Error categories summary */}
          <div className="border rounded-md p-4 bg-background">
            <h3 className="text-sm font-medium mb-2">Error Categories</h3>
            <div className="space-y-2">
              {errorCategories.map((category) => (
                <div key={category.type} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{category.type}</span>
                    <span className="text-muted-foreground">
                      {category.count} files
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-1 overflow-hidden">
                    <div
                      className="bg-primary h-full"
                      style={{
                        width: `${(category.count / failedFiles.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selection controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selectAll"
                checked={selectAll}
                onCheckedChange={() => setSelectAll(!selectAll)}
              />
              <Label htmlFor="selectAll" className="text-sm">
                Select All ({failedFiles.length} files)
              </Label>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedCount} selected
            </div>
          </div>

          {/* Processing options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipLargeFiles"
                checked={skipLargeFiles}
                onCheckedChange={(checked) => setSkipLargeFiles(!!checked)}
              />
              <Label htmlFor="skipLargeFiles" className="text-sm">
                Skip large files over {bytesToSize(LARGE_FILE_THRESHOLD)}
                {largeFileCount > 0 && skipLargeFiles && (
                  <span className="text-muted-foreground ml-2">
                    ({largeFileCount} large files in selection will be skipped)
                  </span>
                )}
              </Label>
            </div>

            <div className="flex flex-col space-y-1">
              <Label htmlFor="method" className="text-sm">
                Extraction Method
              </Label>
              <Select
                value={extractionMethod}
                onValueChange={(value) =>
                  setExtractionMethod(value as ExtractionMethod)
                }
              >
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select a method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="exiftool">ExifTool</SelectItem>
                  <SelectItem value="sharp">Sharp</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Different extraction methods may work better for specific file
                types.
              </p>
            </div>
          </div>

          {/* List of failed files */}
          <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-2 text-left font-medium" />
                  <th className="px-4 py-2 text-left font-medium">File</th>
                  <th className="px-4 py-2 text-left font-medium">Size</th>
                  <th className="px-4 py-2 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {failedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className={`hover:bg-muted/50 ${
                      skipLargeFiles &&
                      file?.size_bytes &&
                      file.size_bytes > LARGE_FILE_THRESHOLD
                        ? 'bg-muted/30 text-muted-foreground'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-2">
                      <Checkbox
                        checked={selected[file.id] || false}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                      />
                    </td>
                    <td className="px-4 py-2 font-mono text-xs truncate max-w-40">
                      {file.file_name}
                    </td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      {bytesToSize(file.size_bytes || 0)}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground truncate">
                      {file.error || 'Missing EXIF data'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Progress display during processing */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {processed} of {selectedCount} processed
                </span>
                <span>{progress}%</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Success: {successCount}</span>
                <span>Large files skipped: {skippedLargeFiles}</span>
              </div>
              <ProcessingTimeEstimator
                isProcessing={isProcessing}
                processed={processed}
                remaining={selectedCount - processed}
                startTime={startTime}
                rateUnit="files/sec"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleRetry}
              disabled={isProcessing || selectedCount === 0}
            >
              Process EXIF Data ({selectedCount})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
