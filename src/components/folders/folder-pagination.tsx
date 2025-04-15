'use client';

import { Pagination } from '@/components/ui/pagination';
import { useRouter, useSearchParams } from 'next/navigation';

interface FolderPaginationProps {
  page: number;
  pageCount: number;
  basePath: string;
}

export default function FolderPagination({
  page,
  pageCount,
  basePath,
}: FolderPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    // Create a new URLSearchParams object based on the current URL
    const params = new URLSearchParams(searchParams.toString());

    // Update the page parameter
    params.set('page', newPage.toString());

    // Preserve the path parameter if it exists
    const path = searchParams.get('path');
    if (path) params.set('path', path);

    // Preserve the includeSubfolders parameter if it exists
    const includeSubfolders = searchParams.get('includeSubfolders');
    if (includeSubfolders === 'true') params.set('includeSubfolders', 'true');

    // Navigate to the new URL
    router.push(`/folders?${params.toString()}`);
  };

  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      onPageChange={handlePageChange}
      showEdges={true}
    />
  );
}
