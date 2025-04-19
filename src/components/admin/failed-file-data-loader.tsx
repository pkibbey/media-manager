import { getFailedFiles } from '@/app/actions/processing';
import type { ErrorCategory, FailedFile } from '@/types/media-types';

// Helper function to categorize error messages into standardized types
function categorizeError(errorMessage: string): string {
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
}

export type FailedFileData = {
  files: FailedFile[];
  count: number;
  errorCategories: ErrorCategory[];
};

export async function loadFailedFileData(): Promise<FailedFileData> {
  // Fetch data directly on the server
  const res = await getFailedFiles();

  if (res.success && res.files) {
    const count = res.count || 0;

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

    return {
      files: res.files,
      count,
      errorCategories: categories,
    };
  }

  // Return empty data if there was an error
  return {
    files: [],
    count: 0,
    errorCategories: [],
  };
}
