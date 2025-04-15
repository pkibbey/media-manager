'use client';

import { cn } from '@/lib/utils';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
} from '@radix-ui/react-icons';
import Link from 'next/link';
import { useState } from 'react';

export type FolderNode = {
  name: string;
  path: string;
  children: FolderNode[];
  mediaCount?: number;
};

interface FolderTreeProps {
  structure: FolderNode[];
  selectedPath: string;
}

export default function FolderTree({
  structure,
  selectedPath,
}: FolderTreeProps) {
  return (
    <div className="space-y-1">
      {structure.map((folder) => (
        <FolderTreeItem
          key={folder.path}
          folder={folder}
          level={0}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

interface FolderTreeItemProps {
  folder: FolderNode;
  level: number;
  selectedPath: string;
}

function FolderTreeItem({ folder, level, selectedPath }: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Auto-expand if the folder is in the path of the selected item
    return selectedPath.startsWith(folder.path);
  });

  const isSelected = selectedPath === folder.path;
  const hasChildren = folder.children.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="space-y-1">
      <Link
        href={`/folders?path=${encodeURIComponent(folder.path)}`}
        className={cn(
          'flex items-center gap-1 py-1.5 px-1 rounded-md text-sm transition-colors hover:bg-secondary',
          isSelected
            ? 'bg-primary text-primary-foreground hover:bg-primary'
            : '',
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className={cn(
              'p-1 rounded-sm hover:bg-muted transition-colors flex items-center justify-center',
              isSelected ? 'text-primary-foreground hover:bg-primary/90' : '',
            )}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-3 w-3" />
            ) : (
              <ChevronRightIcon className="h-3 w-3" />
            )}
          </button>
        ) : (
          <CubeIcon className="h-3 w-3 ml-4 mr-1" />
        )}

        <span className="truncate">{folder.name}</span>

        {folder.mediaCount !== undefined && (
          <span
            className={cn(
              'ml-auto text-xs',
              isSelected
                ? 'text-primary-foreground/70'
                : 'text-muted-foreground',
            )}
          >
            {folder.mediaCount}
          </span>
        )}
      </Link>

      {isExpanded && hasChildren && (
        <div className="space-y-1">
          {folder.children.map((childFolder) => (
            <FolderTreeItem
              key={childFolder.path}
              folder={childFolder}
              level={level + 1}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}
