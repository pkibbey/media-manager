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
              variant={includeSubfolders ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2 transition-all duration-200"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-label={
                includeSubfolders
                  ? 'Viewing all subfolders'
                  : 'Viewing current folder only'
              }
            >
              <span className="relative">
                {includeSubfolders ? (
                  <NestedCubeIcon className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <CubeIcon className="h-4 w-4" />
                )}
                {includeSubfolders && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                  </span>
                )}
              </span>
              <span className="hidden sm:inline">
                {includeSubfolders ? 'All Subfolders' : 'Current Folder Only'}
              </span>
              <ChevronDownIcon className="h-3 w-3 opacity-50" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p>
              {includeSubfolders
                ? 'Viewing all media in this folder and all subfolders'
                : 'Viewing media in this folder only'}
            </p>
          </TooltipContent>
        </Tooltip>

        {isOpen && (
          <div
            className="absolute top-full mt-1 right-0 w-52 bg-popover shadow-md rounded-md overflow-hidden z-50 border animate-in fade-in slide-in-from-top-5"
            role="menu"
          >
            <div className="py-1">
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  onChange(false);
                  setIsOpen(false);
                }}
                role="menuitem"
                aria-current={!includeSubfolders}
              >
                <div className="flex items-center gap-2">
                  <CubeIcon className="h-4 w-4" />
                  <span>Current Folder Only</span>
                </div>
                {!includeSubfolders && <CheckIcon className="h-4 w-4" />}
              </button>
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  onChange(true);
                  setIsOpen(false);
                }}
                role="menuitem"
                aria-current={includeSubfolders}
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

        {/* Overlay to close the dropdown when clicking outside */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </TooltipProvider>
  );
}
