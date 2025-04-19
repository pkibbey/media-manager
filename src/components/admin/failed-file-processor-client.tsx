'use client';

import { retryFailedFiles } from '@/app/actions/processing';
import type { ExtractionMethod } from '@/types/exif';
import type { FailedFileData } from './failed-file-data-loader';
import RetryProcessor from './shared/retry-processor';

interface FailedFileProcessorClientProps {
  initialData: FailedFileData;
  onRefresh: () => Promise<void>;
}

export default function FailedFileProcessorClient({
  initialData,
  onRefresh,
}: FailedFileProcessorClientProps) {
  const handleRetry = async (
    selectedIds: string[],
    options: { skipLargeFiles: boolean; method: string },
  ) => {
    try {
      const result = await retryFailedFiles(selectedIds, {
        skipLargeFiles: options.skipLargeFiles,
        method: options.method as ExtractionMethod,
      });

      // Refresh the data after successful retry
      if (result.success) {
        onRefresh();
      }

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
      title="Failed File Processor"
      description="This tool allows you to retry processing for files that failed in previous attempts. Select the files you want to retry and click 'Retry Selected'."
      items={initialData.files}
      totalCount={initialData.count}
      categories={initialData.errorCategories}
      isLoading={false}
      onRefresh={onRefresh}
      onRetry={handleRetry}
      retryOptions={[
        {
          label: 'Skip Large Files',
          key: 'skipLargeFiles',
          defaultValue: true,
          type: 'checkbox',
        },
        {
          label: 'Processing Method',
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
      getItemDescription={(file) => file.error || 'Unknown error'}
      emptyMessage="No failed files found"
    />
  );
}
