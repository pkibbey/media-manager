'use client';

import { getFailedExifFiles, retryFailedExifFiles } from '@/app/actions/exif';
import type { ExtractionMethod } from '@/types/exif';
import type { ErrorCategory, FailedFile } from '@/types/media-types';
import { useEffect, useState } from 'react';
import RetryProcessor from './shared/retry-processor';

export default function ExifFailedProcessor() {
  const [isLoading, setIsLoading] = useState(true);
  const [failedFiles, setFailedFiles] = useState<FailedFile[]>([]);
  const [errorCategories, setErrorCategories] = useState<ErrorCategory[]>([]);

  useEffect(() => {
    loadFailedFiles();
  }, []);

  const loadFailedFiles = async () => {
    setIsLoading(true);
    try {
      const res = await getFailedExifFiles();
      if (res.success && res.files) {
        setFailedFiles(res.files);

        // Group files by error type
        const errorGroups: Record<string, FailedFile[]> = {};
        res.files.forEach((file: FailedFile) => {
          // Create a simplified error type from the error message
          const errorType = categorizeError(file.error || 'Unknown error');

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
        console.error('Failed to load failed EXIF files');
      }
    } catch (error) {
      console.error('Error loading failed EXIF files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to categorize error messages into standardized types
  const categorizeError = (errorMessage: string): string => {
    const lowerCase = errorMessage.toLowerCase();

    if (lowerCase.includes('not found') || lowerCase.includes('no such file'))
      return 'File Not Found';
    if (lowerCase.includes('permission denied')) return 'Permission Denied';
    if (lowerCase.includes('corrupt') || lowerCase.includes('invalid'))
      return 'Corrupt/Invalid File';
    if (lowerCase.includes('timeout')) return 'Processing Timeout';
    if (lowerCase.includes('unsupported')) return 'Unsupported Format';
    if (lowerCase.includes('metadata') || lowerCase.includes('exif'))
      return 'Metadata Error';
    if (lowerCase.includes('large file')) return 'File Too Large';

    return 'Other Error';
  };

  const handleRetry = async (
    selectedIds: string[],
    options: { skipLargeFiles: boolean; method: string },
  ) => {
    try {
      const result = await retryFailedExifFiles(selectedIds, {
        skipLargeFiles: options.skipLargeFiles,
        method: options.method as ExtractionMethod,
      });

      return {
        success: result.success,
        processedCount: result.processedCount,
        successCount: result.successCount,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred during retry',
      };
    }
  };

  return (
    <RetryProcessor
      title="Failed EXIF Processor"
      description="This tool allows you to retry EXIF extraction for files where it previously failed. Select the files you want to retry and click 'Retry Selected'."
      items={failedFiles}
      categories={errorCategories}
      isLoading={isLoading}
      onRefresh={loadFailedFiles}
      onRetry={handleRetry}
      retryOptions={[
        {
          label: 'Skip Large Files',
          key: 'skipLargeFiles',
          defaultValue: true,
          type: 'checkbox',
        },
        {
          label: 'EXIF Extraction Method',
          key: 'method',
          defaultValue: 'default',
          type: 'select',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'ExifTool', value: 'exiftool' },
            { label: 'ExifReader', value: 'exifreader' },
          ],
        },
      ]}
      renderTableHeader={() => (
        <>
          <th className="px-4 py-2 text-left font-medium">File</th>
          <th className="px-4 py-2 text-left font-medium">Error</th>
        </>
      )}
      renderTableRow={(file, isSelected, onToggle) => (
        <tr key={file.id} className="hover:bg-muted/50">
          <td className="px-4 py-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
          </td>
          <td className="px-4 py-2 font-mono text-xs truncate max-w-40">
            {file.file_name}
          </td>
          <td className="px-4 py-2 text-xs text-muted-foreground truncate">
            {file.error || 'Unknown error'}
          </td>
        </tr>
      )}
      emptyMessage="No files with failed EXIF extraction found"
    />
  );
}
