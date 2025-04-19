import { getFailedExifFiles } from '@/app/actions/exif';
import type { ErrorCategory, FailedFile } from '@/types/media-types';
import { revalidatePath } from 'next/cache';
import { Suspense } from 'react';
import ExifFailedProcessorClient from './exif-failed-processor-client';

// Helper function to categorize error messages into standardized types
function categorizeError(errorMessage: string | null): string {
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
}

export type ExifFailedData = {
  files: FailedFile[];
  errorCategories: ErrorCategory[];
};

async function loadExifFailedData(): Promise<ExifFailedData> {
  // Fetch data on the server
  const res = await getFailedExifFiles();

  if (res.success && res.files) {
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

    return {
      files: res.files,
      errorCategories: categories,
    };
  }

  // Return empty data if there was an error
  return {
    files: [],
    errorCategories: [],
  };
}

export default async function ExifFailedProcessor() {
  // Load the initial data on the server
  const failedData = await loadExifFailedData();

  // Function to refresh data (will be passed to client component)
  const handleRefresh = async () => {
    'use server';
    // Revalidate paths to refresh the server component
    revalidatePath('/admin');
  };

  return (
    <Suspense fallback={<div>Loading failed EXIF files...</div>}>
      <ExifFailedProcessorClient
        initialData={failedData}
        onRefresh={handleRefresh}
      />
    </Suspense>
  );
}
