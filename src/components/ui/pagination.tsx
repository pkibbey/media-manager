'use client';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DotsHorizontalIcon,
} from '@radix-ui/react-icons';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  siblingCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  siblingCount = 1,
}: PaginationProps) {
  // Don't render pagination for a single page
  if (totalPages <= 1) return null;

  // Generate an array of page numbers to show
  const generatePagination = () => {
    // Always show first and last pages, plus current page and siblings
    const pageNumbers: (number | 'ellipsis')[] = [];

    // Always add page 1
    pageNumbers.push(1);

    // Add an ellipsis if there's a gap between page 1 and the first sibling
    if (currentPage - siblingCount > 2) {
      pageNumbers.push('ellipsis');
    }

    // Add sibling pages before current page
    for (
      let i = Math.max(2, currentPage - siblingCount);
      i < currentPage;
      i++
    ) {
      pageNumbers.push(i);
    }

    // Add current page if it's not 1 or totalPages
    if (currentPage !== 1 && currentPage !== totalPages) {
      pageNumbers.push(currentPage);
    }

    // Add sibling pages after current page
    for (
      let i = currentPage + 1;
      i <= Math.min(totalPages - 1, currentPage + siblingCount);
      i++
    ) {
      pageNumbers.push(i);
    }

    // Add an ellipsis if there's a gap between the last sibling and the last page
    if (currentPage + siblingCount < totalPages - 1) {
      pageNumbers.push('ellipsis');
    }

    // Always add the last page if it's not the first page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  const pages = generatePagination();

  return (
    <nav
      className="flex justify-center items-center space-x-2"
      aria-label="Pagination"
    >
      {/* Previous page button */}
      <PaginationLink
        href={`${baseUrl}${currentPage - 1}`}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </PaginationLink>

      {/* Page numbers */}
      {pages.map((page, i) =>
        page === 'ellipsis' ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            key={`ellipsis-${i}`}
            className="px-2 py-1"
          >
            <DotsHorizontalIcon className="h-4 w-4 text-muted-foreground" />
          </span>
        ) : (
          <PaginationLink
            key={page}
            href={`${baseUrl}${page}`}
            active={page === currentPage}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </PaginationLink>
        ),
      )}

      {/* Next page button */}
      <PaginationLink
        href={`${baseUrl}${currentPage + 1}`}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </PaginationLink>
    </nav>
  );
}

interface PaginationLinkProps {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-current'?: 'page' | undefined;
}

function PaginationLink({
  href,
  children,
  active = false,
  disabled = false,
  ...props
}: PaginationLinkProps) {
  if (disabled) {
    return (
      <span
        className="px-3 py-2 rounded-md text-muted-foreground bg-muted cursor-not-allowed flex items-center justify-center"
        aria-disabled="true"
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md flex items-center justify-center ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted hover:text-foreground'
      }`}
      {...props}
    >
      {children}
    </Link>
  );
}
