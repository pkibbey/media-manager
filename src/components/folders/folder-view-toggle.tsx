'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CubeIcon, StackIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface FolderViewToggleProps {
  includeSubfolders: boolean;
  baseUrl: string;
}

export default function FolderViewToggle({
  includeSubfolders,
  baseUrl,
}: FolderViewToggleProps) {
  const searchParams = useSearchParams();

  // Preserve page number when toggling view
  const page = searchParams.get('page');

  // Create URLs that preserve existing parameters
  const getFolderUrl = () => {
    const params = new URLSearchParams();
    const path = searchParams.get('path');
    if (path) params.set('path', path);
    if (page) params.set('page', page);
    // Don't include includeSubfolders parameter for folder view
    return `/folders?${params.toString()}`;
  };

  const getRecursiveUrl = () => {
    const params = new URLSearchParams();
    const path = searchParams.get('path');
    if (path) params.set('path', path);
    if (page) params.set('page', page);
    params.set('includeSubfolders', 'true');
    return `/folders?${params.toString()}`;
  };

  return (
    <div className="flex border rounded-md overflow-hidden">
      <Link href={getFolderUrl()} className="flex-1">
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-1 rounded-none w-full',
            !includeSubfolders && 'bg-secondary',
          )}
        >
          <CubeIcon className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:inline-flex">Folder</span>
        </Button>
      </Link>
      <Link href={getRecursiveUrl()} className="flex-1">
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-1 rounded-none w-full',
            includeSubfolders && 'bg-secondary',
          )}
        >
          <StackIcon className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only sm:inline-flex">
            Recursive
          </span>
        </Button>
      </Link>
    </div>
  );
}
