'use client';

import { Pagination } from '@/components/ui/pagination';

interface FolderPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function FolderPagination({
  currentPage,
  totalPages,
  onPageChange,
}: FolderPaginationProps) {
  return (
    <Pagination
      page={currentPage}
      pageCount={totalPages}
      onPageChange={onPageChange}
      showEdges={true}
    />
  );
}
