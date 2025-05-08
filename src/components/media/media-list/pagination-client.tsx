'use client';

import { useState } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface PaginationClientProps {
  totalCount: number;
  itemsPerPage?: number;
}

const PaginationClient: React.FC<PaginationClientProps> = ({
  totalCount,
  itemsPerPage = 10,
}) => {
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Add logic to fetch new data or update the view based on the page
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            href="#"
            aria-disabled={currentPage === 1}
            className={
              currentPage === 1 ? 'pointer-events-none opacity-50' : ''
            }
          />
        </PaginationItem>

        {currentPage > 3 && (
          <PaginationItem>
            <PaginationLink onClick={() => handlePageChange(1)} href="#">
              1
            </PaginationLink>
          </PaginationItem>
        )}

        {currentPage > 4 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
          let pageNum = i;
          if (currentPage <= 3) {
            pageNum = i + 1;
          } else if (currentPage >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = currentPage - 2 + i;
          }

          if (pageNum < 1 || pageNum > totalPages) {
            return null;
          }

          return (
            <PaginationItem key={pageNum}>
              <PaginationLink
                isActive={pageNum === currentPage}
                onClick={() => handlePageChange(pageNum)}
                href="#"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          );
        })}

        {currentPage < totalPages - 3 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}

        {currentPage < totalPages - 2 && (
          <PaginationItem>
            <PaginationLink
              onClick={() => handlePageChange(totalPages)}
              href="#"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            href="#"
            aria-disabled={currentPage === totalPages}
            className={
              currentPage === totalPages ? 'pointer-events-none opacity-50' : ''
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationClient;
