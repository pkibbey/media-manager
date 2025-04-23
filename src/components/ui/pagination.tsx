'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import Link from 'next/link';
import type * as React from 'react';

interface PaginationProps extends React.ComponentProps<'nav'> {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  showEdges?: boolean;
  /**
   * If provided, pagination will use Next.js Link components with this URL pattern instead of callbacks.
   * Use {page} as a placeholder for the page number, e.g. "/products?page={page}"
   */
  urlPattern?: string;
}

/**
 * A unified pagination component that supports both client-side callbacks and URL-based navigation
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  showEdges = true,
  urlPattern,
  className,
  ...props
}: PaginationProps) {
  // Don't render pagination for a single page
  if (pageCount <= 1) return null;

  // Handle navigation with either client-side callbacks or URL navigation
  const handleNavigation = (targetPage: number) => {
    if (onPageChange && !urlPattern) {
      onPageChange(targetPage);
    }
    // URL navigation is handled by the Link component
  };

  // Generate page buttons to display
  const getPageButtons = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 7; // Maximum number of page numbers to show

    if (pageCount <= maxVisiblePages) {
      // If total pages is less than or equal to max visible, show all pages
      for (let i = 1; i <= pageCount; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range of pages to show around current page
      const leftSideCount = Math.floor((maxVisiblePages - 2) / 2);
      const rightSideCount = maxVisiblePages - 3 - leftSideCount;

      let startPage = Math.max(2, page - leftSideCount);
      let endPage = Math.min(pageCount - 1, page + rightSideCount);

      // Adjust if we're near the beginning
      if (page - leftSideCount < 2) {
        endPage = Math.min(pageCount - 1, maxVisiblePages - 2);
      }

      // Adjust if we're near the end
      if (page + rightSideCount > pageCount - 1) {
        startPage = Math.max(2, pageCount - maxVisiblePages + 2);
      }

      // Add ellipsis before the range if needed
      if (startPage > 2) {
        pages.push('ellipsis');
      }

      // Add the range of pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add ellipsis after the range if needed
      if (endPage < pageCount - 1) {
        pages.push('ellipsis');
      }

      // Always show last page if not already included
      if (endPage < pageCount) {
        pages.push(pageCount);
      }
    }

    return pages;
  };

  // Helper to get URL for a specific page
  const getPageUrl = (targetPage: number) => {
    if (!urlPattern) return '#';
    return urlPattern.replace('{page}', targetPage.toString());
  };

  // Generate page buttons
  const pageButtons = getPageButtons();

  // Conditional rendering for Link or Button component
  const PageButton = ({
    page: buttonPage,
    disabled = false,
  }: {
    page: number;
    disabled?: boolean;
  }) => {
    const isActive = buttonPage === page;

    if (urlPattern) {
      return (
        <Link href={disabled ? '#' : getPageUrl(buttonPage)}>
          <Button
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn('min-w-[32px]', isActive && 'pointer-events-none')}
            disabled={disabled}
            aria-label={`Page ${buttonPage}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {buttonPage}
          </Button>
        </Link>
      );
    }

    return (
      <Button
        variant={isActive ? 'default' : 'outline'}
        size="sm"
        className={cn('min-w-[32px]', isActive && 'pointer-events-none')}
        onClick={() => handleNavigation(buttonPage)}
        disabled={disabled}
        aria-label={`Page ${buttonPage}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {buttonPage}
      </Button>
    );
  };

  // Conditional rendering for navigation buttons
  const NavButton = ({
    targetPage,
    icon,
    label,
    disabled = false,
  }: {
    targetPage: number;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
  }) => {
    if (urlPattern) {
      return (
        <Link href={disabled ? '#' : getPageUrl(targetPage)}>
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label={label}
          >
            {icon}
          </Button>
        </Link>
      );
    }

    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => handleNavigation(targetPage)}
        disabled={disabled}
        aria-label={label}
      >
        {icon}
      </Button>
    );
  };

  return (
    <nav
      className={cn('flex items-center justify-center space-x-2', className)}
      aria-label="Pagination"
      {...props}
    >
      {showEdges && (
        <NavButton
          targetPage={1}
          icon={<DoubleArrowLeftIcon className="h-4 w-4" />}
          label="First page"
          disabled={page === 1}
        />
      )}

      <NavButton
        targetPage={page - 1}
        icon={<ChevronLeftIcon className="h-4 w-4" />}
        label="Previous page"
        disabled={page === 1}
      />

      {/* Page numbers */}
      <div className="flex items-center space-x-1">
        {pageButtons.map((pageNum, index) =>
          pageNum === 'ellipsis' ? (
            <div
              key={`ellipsis-${index}`}
              className="px-2 text-muted-foreground"
            >
              &hellip;
            </div>
          ) : (
            <PageButton key={pageNum} page={pageNum} />
          ),
        )}
      </div>

      <NavButton
        targetPage={page + 1}
        icon={<ChevronRightIcon className="h-4 w-4" />}
        label="Next page"
        disabled={page === pageCount}
      />

      {showEdges && (
        <NavButton
          targetPage={pageCount}
          icon={<DoubleArrowRightIcon className="h-4 w-4" />}
          label="Last page"
          disabled={page === pageCount}
        />
      )}
    </nav>
  );
}
