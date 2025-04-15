'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckIcon, ChevronDownIcon, CubeIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

interface FolderViewToggleProps {
  includeSubfolders: boolean;
  onChange: (includeSubfolders: boolean) => void;
}

function NestedCubeIcon(props: React.ComponentProps<typeof CubeIcon>) {
  return (
    <div className="relative w-4 h-4">
      <CubeIcon {...props} className="absolute top-0 left-0" />
      <CubeIcon
        {...props}
        className="absolute bottom-0 right-0 h-3 w-3 transform translate-x-1 translate-y-1"
      />
    </div>
  );
}

export default function FolderViewToggle({
  includeSubfolders,
  onChange,
}: FolderViewToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setIsOpen(!isOpen)}
            >
              {includeSubfolders ? (
                <NestedCubeIcon className="h-4 w-4" />
              ) : (
                <CubeIcon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {includeSubfolders ? 'All Subfolders' : 'Current Folder Only'}
              </span>
              <ChevronDownIcon className="h-3 w-3 opacity-50" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {includeSubfolders
                ? 'Viewing all subfolders'
                : 'Viewing current folder only'}
            </p>
          </TooltipContent>
        </Tooltip>

        {isOpen && (
          <div className="absolute top-full mt-1 right-0 w-52 bg-popover shadow-md rounded-md overflow-hidden z-50 border animate-in fade-in">
            <div className="py-1">
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onChange(false);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <CubeIcon className="h-4 w-4" />
                  <span>Current Folder Only</span>
                </div>
                {!includeSubfolders && <CheckIcon className="h-4 w-4" />}
              </button>
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onChange(true);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <NestedCubeIcon className="h-4 w-4" />
                  <span>Include Subfolders</span>
                </div>
                {includeSubfolders && <CheckIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
