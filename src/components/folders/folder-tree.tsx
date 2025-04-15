'use client';

import type { FolderStructure } from '@/app/api/actions/folders';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
} from '@radix-ui/react-icons';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface FolderTreeProps {
  structure: FolderStructure;
  selectedPath: string;
  level?: number;
}

export default function FolderTree({
  structure,
  selectedPath,
  level = 0,
}: FolderTreeProps) {
  const searchParams = useSearchParams();
  const includeSubfolders = searchParams.get('includeSubfolders') === 'true';
  
  // Keep track of expanded folders
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // By default, expand folders in the path to the selected folder
    const initialState: Record<string, boolean> = {};

    if (selectedPath !== '/') {
      const pathParts = selectedPath.split('/').filter(Boolean);
      let currentPath = '';

      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
        initialState[currentPath] = true;
      }
    }

    return initialState;
  });

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const isExpanded = (path: string) => !!expanded[path];
  const isSelected = structure.path === selectedPath;

  // Don't render empty folders without subfolders or items
  if (
    !structure.isRoot &&
    structure.itemCount === 0 &&
    structure.subfolders.length === 0
  ) {
    return null;
  }

  return (
    <div className={`${level > 0 ? 'ml-4 border-l pl-2' : ''}`}>
      <div
        className={`flex items-center py-1 ${isSelected ? 'text-primary font-medium' : 'hover:text-primary'}`}
      >
        {/* Expand/collapse button */}
        {structure.subfolders.length > 0 ? (
          <button
            onClick={() => toggleExpand(structure.path)}
            className="mr-1 p-0.5 rounded-sm hover:bg-muted"
            aria-label={
              isExpanded(structure.path) ? 'Collapse folder' : 'Expand folder'
            }
          >
            {isExpanded(structure.path) ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" /> // Spacer for alignment
        )}

        <Link
          href={`/folders?path=${encodeURIComponent(structure.path)}${includeSubfolders ? '&includeSubfolders=true' : ''}`}
          className="flex items-center gap-1 py-1 rounded-sm hover:bg-muted px-1 flex-grow"
        >
          <CubeIcon className="h-4 w-4 mr-1" />
          <span className="truncate">{structure.name}</span>
          {structure.itemCount > 0 && (
            <span className="text-muted-foreground text-xs ml-1">
              ({structure.itemCount})
            </span>
          )}
        </Link>
      </div>

      {/* Render subfolders if expanded */}
      {isExpanded(structure.path) && structure.subfolders.length > 0 && (
        <div>
          {structure.subfolders.map((subfolder) => (
            <FolderTree
              key={subfolder.path}
              structure={subfolder}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
