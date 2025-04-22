export function categorizeError(errorMessage: string): string {
  const lowerCaseError = errorMessage.toLowerCase();

  if (lowerCaseError.includes('no such file')) return 'File Not Found';
  if (lowerCaseError.includes('permission denied')) return 'Permission Denied';
  if (lowerCaseError.includes('corrupt') || lowerCaseError.includes('invalid'))
    return 'Corrupt/Invalid File';
  if (lowerCaseError.includes('timeout')) return 'Processing Timeout';
  if (
    lowerCaseError.includes('format') ||
    lowerCaseError.includes('unsupported')
  )
    return 'Unsupported Format';
  if (lowerCaseError.includes('memory')) return 'Out of Memory';
  if (lowerCaseError.includes('large file')) return 'File Too Large';
  if (lowerCaseError.includes('storage')) return 'Storage Error';

  return 'Other Errors';
}
